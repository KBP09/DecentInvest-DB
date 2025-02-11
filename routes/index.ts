import express from 'express'
import authRoute from './authRoute'
import { getProfile, createStartup, setProfile, profileCheck } from '../controllers/profileController';
import { transaction, updateTransaction,getAllTransactions } from '../controllers/transactionService';
import { authenticateToken } from '../controllers/authController';
import { getAllTokens } from '../controllers/walletService';
import cors from 'cors';

const app = express();
app.use(
    cors({
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    })
);

app.use(express.json());

app.use("/auth", authRoute);
app.use("/setProfile", authenticateToken, setProfile);
app.use("/profileCheck", profileCheck);
app.use("/getProfile", authenticateToken, getProfile);
app.use("/create-startup", authenticateToken, createStartup);
app.use("/transaction", authenticateToken, transaction);
app.use("/updateTransaction", authenticateToken, updateTransaction);
app.use("/getAllTokens", authenticateToken, getAllTokens);
app.use("/recents",getAllTransactions);

export default app;