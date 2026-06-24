// middlewares/isAuthenticated.js
import jwt from "jsonwebtoken";
import ENV from "../config/env.js";
import { getRedis } from "../config/db.js";
import User from "../models/userModel.js";

export const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    // 401 = not authenticated (no token provided)
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    // Verify JWT — catches expired, tampered, or malformed tokens
    let decodedData;
    try {
      decodedData = jwt.verify(token, ENV.ACCESS_SECRET);
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      return res.status(401).json({
        success: false,
        message: isExpired
          ? "Session expired. Please log in again."
          : "Invalid token.",
      });
    }

    const redis = getRedis();
    const cacheKey = `user:${decodedData._id}`;
    const cachedUser = await redis.get(cacheKey);

    if (cachedUser) {
      req.user = JSON.parse(cachedUser);
      return next();
    }

    // Cache miss — fetch from DB, never expose password
    const user = await User.findById(decodedData._id)
      .select("-password")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account not found. Please log in again.",
      });
    }

    // TTL: align cache lifetime with access token expiry
    // Avoids serving stale user data (deleted account, role change)
    // after the access token would have expired anyway
    const tokenExpiresAt = decodedData.exp; // seconds (JWT standard)
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(tokenExpiresAt - now, 1); // never set TTL of 0

    await redis.set(cacheKey, JSON.stringify(user), { EX: ttl });

    req.user = user;
    return next();
  } catch (err) {
    // Never leak internal error details to the client
    console.error("[isAuthenticated]", err);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred.",
    });
  }
};

export const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Insufficient permissions.",
        });
      }

      next();
    } catch (err) {
      console.error("[checkRole]", err);

      return res.status(500).json({
        success: false,
        message: "An internal error occurred.",
      });
    }
  };
};