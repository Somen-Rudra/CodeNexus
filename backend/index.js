import express from "express";
import ENV from "./config/env.js";
import { connectMongoDB, connectRedis } from "./config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

// Routes
import authRouter      from "./routes/authRoutes.js";
import userRouter      from "./routes/userRoutes.js";
import problemRouter   from "./routes/problemRoutes.js";
import aiRouter        from "./routes/aiRoutes.js";
import adminRouter     from "./routes/adminRoutes.js";
import contestRouter   from "./routes/contestRoutes.js";   // ← NEW
import interviewRouter from "./routes/interviewRoutes.js"; // ← NEW

// Background jobs
import { startContestStatusJob } from "./config/contestStatusJob.js"; // ← NEW

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan("dev"));
app.use(
  cors({
    origin:      ENV.FRONTEND_URL,
    credentials: true,
    methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth",       authRouter);
app.use("/user",       userRouter);
app.use("/problemSet", problemRouter);
app.use("/ai",         aiRouter);
app.use("/admin",      adminRouter);
app.use("/contests",   contestRouter);   // ← NEW
app.use("/interviews", interviewRouter); // ← NEW

// ── Boot ──────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectMongoDB();
    await connectRedis();

    // Start contest status sync job (UPCOMING → LIVE → ENDED every 60 s)
    startContestStatusJob(60_000); // ← NEW

    app.listen(ENV.PORT, () => {
      console.log(`Server: http://localhost:${ENV.PORT}`);
    });
  } catch (error) {
    console.log(`Server: ${error.message}`);
  }
};

startServer();