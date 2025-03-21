import express from 'express'
import authRoute from './authRoute'
import { getProfile, setProfile, profileCheck, getUserRole } from '../controllers/profileController';
import { transaction, updateTransaction, getAllTransactions, getUserChainBalance } from '../controllers/transactionService';
import { authenticateToken } from '../controllers/authController';
import { getAllTokens, getUSDCBalance } from '../controllers/walletService';
import { createStartup, getStartup, updateNFT, getAllStartup, publishStartup } from '../controllers/startupController';
import { storeSecurityToken } from '../controllers/STcontroller';
import { invest, updateInvestment, investments } from '../controllers/investmentController';
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
app.use("/getUserRole", authenticateToken, getUserRole);
app.use("/recents", getAllTransactions);
app.use("/startup/:startupId", getStartup);
app.use("/updateNFT", authenticateToken, updateNFT);
app.use("/getAllStartup", getAllStartup);
app.use("/publish", publishStartup);
app.use("/storeSecurityToken", storeSecurityToken);
app.use("/getBalance", getUSDCBalance);
app.use("/invest", authenticateToken, invest);
app.use("/updateInvestment", authenticateToken, updateInvestment);
app.use("/getInvestments", authenticateToken, investments);
export default app;