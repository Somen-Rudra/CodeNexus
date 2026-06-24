import express from "express";
import { isAuthenticated, checkRole } from "../middlewares/isAuthenticated.js";
import {
  listContests,
  getContest,
  getContestTimer,
  registerForContest,
  unregisterFromContest,
  contestSubmit,
  getLeaderboard,
  getMyContestStatus,
  createContest,
  updateContest,
  togglePublishContest,
  finalizeContest,
  deleteContest,
} from "../controllers/contestController.js";

const contestRouter = express.Router();
const adminGuard    = [isAuthenticated, checkRole("admin")];

/* =========================
   Public Routes
========================= */

// List & detail
contestRouter.get("/",            listContests);
contestRouter.get("/:slug",       getContest);       // auth optional (attach isRegistered)
contestRouter.get("/:slug/timer", getContestTimer);  // polled by frontend countdown

// Leaderboard (public after contest starts)
contestRouter.get("/:slug/leaderboard", getLeaderboard);

/* =========================
   Authenticated Routes
========================= */

// Registration
contestRouter.post  ("/:slug/register",   isAuthenticated, registerForContest);
contestRouter.delete("/:slug/register",   isAuthenticated, unregisterFromContest);

// Submission (live contest only)
contestRouter.post("/:slug/submit",       isAuthenticated, contestSubmit);

// Personal status + submissions within contest
contestRouter.get ("/:slug/me",           isAuthenticated, getMyContestStatus);

/* =========================
   Admin Routes
========================= */

contestRouter.post  ("/",                 ...adminGuard, createContest);
contestRouter.patch ("/:slug",            ...adminGuard, updateContest);
contestRouter.patch ("/:slug/publish",    ...adminGuard, togglePublishContest);
contestRouter.post  ("/:slug/finalize",   ...adminGuard, finalizeContest);
contestRouter.delete("/:slug",            ...adminGuard, deleteContest);

export default contestRouter;