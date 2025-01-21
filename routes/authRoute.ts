import express from 'express'
import { signup, setRole, login } from '../controllers/authController'
import { authenticateToken } from '../controllers/authController';

const authRoute = express.Router();

authRoute.post("/signup", signup);
authRoute.post("/setRole", authenticateToken, setRole);
authRoute.post("/login", login);

export default authRoute;