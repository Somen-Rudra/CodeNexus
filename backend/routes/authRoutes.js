import express from "express";
import { loginUser, logoutUser, myProfile, refreshToken, registerUser,verifyOtp,verifyUser } from "../controllers/authController.js";
import {isAuthenticated} from "../middlewares/isAuthenticated.js"

const authRouter = express.Router();

authRouter.post("/register",registerUser);
authRouter.get("/verify/:token",verifyUser);
authRouter.post("/login",loginUser)
authRouter.post("/verify",verifyOtp)
authRouter.get("/me",isAuthenticated,myProfile)
authRouter.post("/refresh",refreshToken)
authRouter.post("/logout",isAuthenticated,logoutUser)


export default authRouter;