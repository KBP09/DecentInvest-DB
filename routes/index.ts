import express from 'express'
import authRoute from './authRoute'

const app = express();

app.use(express.json());

app.use("/auth", authRoute);

export default app;