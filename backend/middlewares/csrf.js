import crypto from "crypto";
import { getRedis } from "../config/db.js";

export const generateCSRFToken = async (_id, rs) => {
  const csrfToken = crypto.randomBytes(32).toString("hex");
  const csrfKey = `csrf:${_id}`;
  const redis = getRedis();

  await redis.setEx(csrfKey, 3600, csrfToken);

  res.cookie("csrfToken", csrfToken, {
    httpOnly: false,
    secure: true,
    samesite: "none",
    maxAge: 60 * 60 * 1000,
  });

  return csrfToken;
};

export const verifyCSRFToken = async (req, res, next) => {
  try {
    if (req.method === "GET") {
      return next();
    }

    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const clientToken =
      req.headers["x-csrf-token"] ||
      req.headers["x-xsrf-token"] ||
      req.headers["csrf-token"];
    if (!clientToken) {
      return req.status(403).json({
        success: false,
        message: "CSRF Token missing. Please refresh the page.",
        code: "CSRF_TOKEN_MISSING",
      });
    }

    const csrfKey = `csrf:${userId}`;
    const redis = getRedis();

    const storedToken = await redisClient.get(csrfKey);
    if (!storedToken) {
      return res.status(403).json({
        success: false,
        message: "CSRF Token expired. Please refresh the page.",
        code: "CSRF_TOKEN_EXPIRED",
      });
    }

    if(storedToken !== clientToken){
        return res.status(403).json({
        success: false,
        message: "Invalid CSRF Token . Please refresh the page.",
        code: "CSRF_TOKEN_INVALID",
      });
    }

    next();

  } catch (error) {
    console.log("CSRF verification error:",error);
  }
};
