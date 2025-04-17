import express from 'express'
import authRoute from './authRoute'
import { getProfile, setProfile, profileCheck, getUserRole, getInvestorProfile, getUserProfile, getCeoProfile, getAllCEO } from '../controllers/profileController';
import { transaction, updateTransaction, getAllTransactions } from '../controllers/transactionService';
import { authenticateToken, userNameCheck } from '../controllers/authController';
import { getAllTokens, getUSDCBalance, getNativeBalance, storePolymeshWallet } from '../controllers/walletService';
import { createStartup, getStartup, updateNFT, getAllStartup, publishStartup, getContractId } from '../controllers/startupController';
import { storeSecurityToken, calculateTokens, updateSecurityTokenStep, updateDistribution } from '../controllers/STcontroller';
import { invest, updateInvestment, investments, addPolymeshWallet, startupInvestments, investmentData } from '../controllers/investmentController';
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
app.use("/getUserProfile", authenticateToken, getUserProfile);
app.use("/getCeoProfile", authenticateToken, getCeoProfile);
app.use("/getInvestorProfile", authenticateToken, getInvestorProfile);
app.use("/createStartup",authenticateToken, createStartup);
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
app.use("/getNativeBalance", getNativeBalance);
app.use("/invest", authenticateToken, invest);
app.use("/updateInvestment", authenticateToken, updateInvestment);
app.use("/getInvestments", authenticateToken, investments);
app.use("/addPolymeshWallet", authenticateToken, addPolymeshWallet);
app.use("/startupInvestments", authenticateToken, startupInvestments);
app.use("/calculateTokens", calculateTokens);
app.use("/investmentData", authenticateToken, investmentData);
app.use("/updateSecurityTokenStep", updateSecurityTokenStep);
app.use("/updateDistribution", authenticateToken, updateDistribution);
app.use("/connectWallet", authenticateToken, storePolymeshWallet);
app.use("/getAllCeo", authenticateToken, getAllCEO);
app.use("/getContractId", getContractId);
app.use("/userNameCheck", userNameCheck);

export default app;