import express from 'express'
import { signup, setRole, login, verifyOtp } from '../controllers/authController'
import { authenticateToken } from '../controllers/authController';

const authRoute = express.Router();

authRoute.post("/signup", signup);
authRoute.post("/setRole", authenticateToken, setRole);
authRoute.post("/login", login);
authRoute.post("/verifyOtp", verifyOtp);

export default authRoute;