import express from 'express'
import authRoute from './authRoute'
import { getProfile, setProfile, profileCheck, getUserRole } from '../controllers/profileController';
import { transaction, updateTransaction, getAllTransactions, getUserChainBalance } from '../controllers/transactionService';
import { authenticateToken } from '../controllers/authController';
import { getAllTokens } from '../controllers/walletService';
import { createStartup } from '../controllers/nftController';
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
app.use("/createStartup", createStartup);
app.use("/transaction", authenticateToken, transaction);
app.use("/updateTransaction", authenticateToken, updateTransaction);
app.use("/getAllTokens", authenticateToken, getAllTokens);
app.use("/getBalance",authenticateToken,getUserChainBalance);
app.use("/getUserRole", authenticateToken, getUserRole);
app.use("/recents", getAllTransactions);

export default app;