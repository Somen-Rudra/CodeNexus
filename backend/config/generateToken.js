import jwt from "jsonwebtoken";
import ENV from "./env.js";
import { getRedis } from "./db.js";

const accessTokenName = "accessToken";
const refreshTokenName = "refreshToken";

const accessExpiresIn = 15; // in min
const refreshExpiresIn = 7; // in days

const accessCookieOptions = {
  httpOnly: true,
  secure: ENV.NODE_ENV === "production",
  sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
  maxAge: accessExpiresIn * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: ENV.NODE_ENV === "production",
  sameSite: ENV.NODE_ENV === "production" ? "none" : "lax",
  maxAge: refreshExpiresIn * 24 * 60 * 60 * 1000,
};

export const generateToken = async (_id, res) => {
  const accessToken = jwt.sign({ _id }, ENV.ACCESS_SECRET, {
    expiresIn: `${accessExpiresIn}m`,
  });
  const refreshToken = jwt.sign({ _id }, ENV.REFRESH_SECRET, {
    expiresIn: `${refreshExpiresIn}d`,
  });

  const redis = getRedis();

  const refreshTokenKey = `refresh_token:${_id}`;
  await redis.setEx(refreshTokenKey, refreshExpiresIn * 24 * 60 * 60, refreshToken);

  res.cookie(accessTokenName, accessToken, accessCookieOptions);

  res.cookie(refreshTokenName, refreshToken, refreshCookieOptions);

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = async (refreshToken) => {
  try {
    const decode = jwt.verify(refreshToken, ENV.REFRESH_SECRET);
    const redis = getRedis();

    const storedToken = await redis.get(`refresh_token:${decode._id}`);
    if (storedToken === refreshToken) {
      return decode;
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const generateAccessToken = async (_id, res) => {
  try {
    const accessToken = jwt.sign({ _id }, ENV.ACCESS_SECRET, {
      expiresIn: `${accessExpiresIn}m`,
    });

    res.cookie(accessTokenName, accessToken, accessCookieOptions);
    return accessToken;
  } catch (error) {
    throw new Error(error.message);
  }
};

export const revokeRefreshToken = async (_id) => {
  const redis = getRedis();
  await redis.del(`refresh_token:${_id}`);
};
