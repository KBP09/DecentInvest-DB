import express from 'express'
import authRoute from './authRoute'
import { getProfile } from '../controllers/profileController';

const app = express();

app.use(express.json());

app.use("/auth", authRoute);
app.use("/getProfile",getProfile);

export default app;