import express from "express";
import {
  getUserStats,
  recentSubmissions,
  getAllSubmissions,
} from "../controllers/userController.js";
import { isAuthenticated } from "../middlewares/isAuthenticated.js";

const userRouter = express.Router();

userRouter.get("/stats",               isAuthenticated, getUserStats);
userRouter.get("/submissions/recent",  isAuthenticated, recentSubmissions);
userRouter.get("/submissions",         isAuthenticated, getAllSubmissions);

export default userRouter;