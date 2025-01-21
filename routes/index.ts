import express from 'express'
import authRoute from './authRoute'
import { getProfile, createStartup } from '../controllers/profileController';
import { authenticateToken } from '../controllers/authController';

const app = express();

app.use(express.json());

app.use("/auth", authRoute);
app.use("/getProfile", authenticateToken, getProfile);
app.use("/create-startup", authenticateToken, createStartup);

export default app;