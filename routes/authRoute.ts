import express from 'express'
import { signup } from '../controllers/authController'

const authRoute = express.Router();

authRoute.post("/signup",signup);

export default authRoute;