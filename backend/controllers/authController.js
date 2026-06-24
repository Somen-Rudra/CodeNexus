import sendMail from "../config/sendMail.js";
import TryCatch from "../middlewares/TryCatch.js";
import sanitize from "mongo-sanitize";
import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { loginSchema, registerSchema } from "../config/zod.js";
import { getOtpHtml, getVerifyEmailHtml } from "../config/html.js";
import { getRedis } from "../config/db.js";
import {
  generateAccessToken,
  generateToken,
  revokeRefreshToken,
  verifyRefreshToken,
} from "../config/generateToken.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts and formats Zod validation errors into a structured response.
 */
const formatZodErrors = (zodError) => {
  if (!zodError?.issues || !Array.isArray(zodError.issues)) {
    return { firstMessage: "Validation Error", allErrors: [] };
  }
  const allErrors = zodError.issues.map((issue) => ({
    field: issue.path?.join(".") ?? "unknown",
    message: issue.message ?? "Validation Error",
    code: issue.code,
  }));
  return {
    firstMessage: allErrors[0]?.message ?? "Validation Error",
    allErrors,
  };
};

/**
 * Checks a Redis rate-limit key. Returns true if the request should be blocked.
 */
const isRateLimited = async (redis, key) => {
  const exists = await redis.get(key);
  return !!exists;
};

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);
  const validation = registerSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const { firstMessage, allErrors } = formatZodErrors(validation.error);
    return res
      .status(400)
      .json({ success: false, message: firstMessage, errors: allErrors });
  }

  const { name, email, password } = validation.data;
  const redis = getRedis();

  // Rate-limit: 1 register attempt per IP+email per minute
  const rateLimitKey = `register-rate-limit:${req.ip}:${email}`;
  if (await isRateLimited(redis, rateLimitKey)) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  // Fail fast if user already exists (optimistic check before hashing)
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 12); // 12 rounds for better security
  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyKey = `verify:${verifyToken}`;

  await redis.set(
    verifyKey,
    JSON.stringify({ name, email, password: hashedPassword }),
    { EX: 300 }, // 5 minutes
  );

  await sendMail({
    email,
    subject: "Verify your email to create your account",
    html: getVerifyEmailHtml({ email, token: verifyToken }),
  });

  // Set rate-limit AFTER the work is done so failures don't consume the limit
  await redis.set(rateLimitKey, "true", { EX: 60 });

  return res.status(200).json({
    success: true,
    message:
      "A verification link has been sent to your email. It will expire in 5 minutes.",
  });
});

// ─── Verify Email ─────────────────────────────────────────────────────────────

export const verifyUser = TryCatch(async (req, res) => {
  const { token } = req.params;

  if (!token || typeof token !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Verification token is required." });
  }

  const redis = getRedis();
  const verifyKey = `verify:${token}`;
  const userDataJson = await redis.get(verifyKey);

  if (!userDataJson) {
    return res.status(400).json({
      success: false,
      message:
        "This verification link has expired or is invalid. Please register again.",
    });
  }

  // Delete the token immediately to prevent replay attacks
  await redis.del(verifyKey);

  const userData = JSON.parse(userDataJson);

  try {
    const newUser = await User.create({
      name: userData.name,
      email: userData.email,
      password: userData.password,
    });

    return res.status(201).json({
      success: true,
      message: "Email verified successfully! Your account has been created.",
      user: { _id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (err) {
    // Handle race condition: duplicate key error from MongoDB unique index
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    throw err; // Re-throw unexpected errors for TryCatch middleware to handle
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginUser = TryCatch(async (req, res) => {
  const sanitizedBody = sanitize(req.body);
  const validation = loginSchema.safeParse(sanitizedBody);

  if (!validation.success) {
    const { firstMessage, allErrors } = formatZodErrors(validation.error);
    return res
      .status(400)
      .json({ success: false, message: firstMessage, errors: allErrors });
  }

  const { email, password } = validation.data;
  const redis = getRedis();

  // Rate-limit: 1 login attempt per IP+email per minute
  const rateLimitKey = `login-rate-limit:${req.ip}:${email}`;
  if (await isRateLimited(redis, rateLimitKey)) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  }

  // Always select password explicitly since it's select:false in schema
  const user = await User.findOne({ email }).select("+password");

  // Use constant-time comparison path regardless of whether user exists
  // to prevent user enumeration via timing attacks
  const dummyHash =
    "$2b$12$invalidhashusedfortimingprotection000000000000000000000";
  const passwordToCompare = user ? user.password : dummyHash;
  const isMatch = await bcrypt.compare(password, passwordToCompare);

  if (!user || !isMatch) {
    await redis.set(rateLimitKey, "true", { EX: 60 });
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials." });
  }

  // Invalidate any existing OTP for this email before issuing a new one
  const otpKey = `otp:${email}`;
  await redis.del(otpKey);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(otpKey, JSON.stringify(otp), { EX: 300 }); // 5 minutes

  await sendMail({
    email,
    subject: "Your login OTP",
    html: getOtpHtml({ email, otp }),
  });

  await redis.set(rateLimitKey, "true", { EX: 60 });

  return res.status(200).json({
    success: true,
    message: "An OTP has been sent to your email. It is valid for 5 minutes.",
  });
});

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export const verifyOtp = TryCatch(async (req, res) => {
  // Sanitize and validate inputs
  const { email, otp } = sanitize(req.body);

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and OTP are required." });
  }

  // Validate OTP format: must be exactly 6 digits
  if (!/^\d{6}$/.test(otp)) {
    return res
      .status(400)
      .json({ success: false, message: "OTP must be a 6-digit number." });
  }

  const redis = getRedis();

  // Rate-limit OTP verification to prevent brute-force (6-digit = 1M combinations)
  const rateLimitKey = `otp-verify-rate-limit:${email}`;
  if (await isRateLimited(redis, rateLimitKey)) {
    return res.status(429).json({
      success: false,
      message: "Too many OTP attempts. Please request a new OTP.",
    });
  }

  const otpKey = `otp:${email}`;
  const storedOtpString = await redis.get(otpKey);

  if (!storedOtpString) {
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please login again.",
    });
  }

  const storedOtp = JSON.parse(storedOtpString);

  if (storedOtp !== otp) {
    // Rate-limit only on failure, not on success
    await redis.set(rateLimitKey, "true", { EX: 60 });
    return res.status(400).json({ success: false, message: "Invalid OTP." });
  }

  // OTP is valid — clean up
  await redis.del(otpKey);
  await redis.del(rateLimitKey); // Clear failed-attempt counter on success

  const user = await User.findOne({ email }).select("-password");

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  await generateToken(user._id, res);

  return res.status(200).json({
    success: true,
    message: `Welcome back, ${user.name}!`,
    user,
  });
});

// ─── My Profile ───────────────────────────────────────────────────────────────
export const myProfile = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password")
    .populate("solvedProblems", "difficulty")
    .lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  const solvedCount = user.solvedCount ?? { easy: 0, medium: 0, hard: 0 };
  const totalSolved = solvedCount.easy + solvedCount.medium + solvedCount.hard;

  return res.status(200).json({
    success: true,
    user: {
      ...user,
      solvedCount,
      totalSolved,
    },
  });
});

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refreshToken = TryCatch(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token)
    return res
      .status(401)
      .json({ success: false, message: "Refresh token is missing." });

  const decoded = await verifyRefreshToken(token);
  if (!decoded)
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired refresh token." });

  // Rotate: revoke old, issue new pair
  await revokeRefreshToken(decoded._id);
  await generateToken(decoded._id, res);

  return res.status(200).json({ success: true, message: "Tokens refreshed." });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logoutUser = TryCatch(async (req, res) => {
  const userId = req.user._id;
  const redis = getRedis();

  await revokeRefreshToken(userId);

  // Clear both auth cookies
  const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict" };
  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  // Clear user cache from Redis
  await redis.del(`user:${userId}`);

  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully." });
});
