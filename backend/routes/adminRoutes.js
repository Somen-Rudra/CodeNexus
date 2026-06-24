// routes/adminRouter.js
import express from "express";
import { isAuthenticated, checkRole } from "../middlewares/isAuthenticated.js";
import {
  getAllUsers,
  updateUserRole,
  toggleUserPremium,
  deleteUser,
  getAllSubmissions,
  getPlatformStats,
} from "../controllers/adminController.js";

const adminRouter = express.Router();
const guard = [isAuthenticated, checkRole("admin")];

adminRouter.get("/users", ...guard, getAllUsers);
adminRouter.patch("/users/:id/role", ...guard, updateUserRole);
adminRouter.patch("/users/:id/premium", ...guard, toggleUserPremium);
adminRouter.delete("/users/:id", ...guard, deleteUser);
adminRouter.get("/submissions", ...guard, getAllSubmissions);
adminRouter.get("/stats", ...guard, getPlatformStats);

export default adminRouter;
