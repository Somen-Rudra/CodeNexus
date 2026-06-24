import mongoose from "mongoose";
import ENV from "./env.js";
import { createClient } from "redis";

export const connectMongoDB = async () => {
  try {
    const conn = await mongoose.connect(ENV.URI, {
      dbName: "Test",
    });

    console.log(`MongoDB connected [${conn.connection.name}]`);
  } catch (error) {
    console.log(`MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

let redisClient;

export const connectRedis = async () => {
  try {
    if (!redisClient) {
      redisClient = createClient({
        url: ENV.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      });

      redisClient.on("error", (err) => {
        console.log("Redis Error:", err.message);
      });

      redisClient.on("connect", () => {
        console.log("Redis connected");
      });

      await redisClient.connect();
    }

    return redisClient;
  } catch (error) {
    console.log("Redis Connect Error:", error.message);
    process.exit(1);
  }
};

export const getRedis = () => {
  if (!redisClient) {
    throw new Error("Redis not initialized");
  }

  return redisClient;
};