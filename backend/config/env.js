import "dotenv/config.js";

const requiredEnv = [
  "URI",
  "PORT",
  "ACCESS_SECRET",
  "REFRESH_SECRET",
  "NODE_ENV",
  "EMAIL_TOKEN",
  "REDIS_URL",
  "SMTP_PASSWORD",
  "SMTP_USER",
  "FRONTEND_URL"
];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

const ENV = Object.fromEntries(
  requiredEnv.map((key) => [key, process.env[key]])
);

export default ENV;