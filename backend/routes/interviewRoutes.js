import express from "express";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";
import {
  createSession,
  listSessions,
  getSession,
  startSession,
  endSession,
  submitFeedback,
  getSessionFeedback,
} from "../controllers/interviewController.js";

const interviewRouter = express.Router();

// All interview routes require authentication
interviewRouter.use(isAuthenticated);

interviewRouter.post  ("/",                         createSession);
interviewRouter.get   ("/",                         listSessions);
interviewRouter.get   ("/:sessionId",               getSession);
interviewRouter.patch ("/:sessionId/start",         startSession);
interviewRouter.patch ("/:sessionId/end",           endSession);
interviewRouter.post  ("/:sessionId/feedback",      submitFeedback);
interviewRouter.get   ("/:sessionId/feedback",      getSessionFeedback);

export default interviewRouter;