import { Request, Response } from "express";
import dotenv from 'dotenv';
import prisma from "../DB/db.config";

dotenv.config();

export const storeSecurityToken = async (req: Request, res: Response): Promise<any> => {
    const { startupId, ticker, tokenName, assetId, totalSupply, ownerWallet } = req.body;

    try {
        const token = await prisma.securityToken.create({
            data: {
                startupId: startupId,
                symbol: ticker,
                tokenName: tokenName,
                totalSupply: totalSupply,
                ownerWallet: ownerWallet,
                assetId: assetId,
            }
        });

        console.log("Stored Security Token:", token);
        return res.status(200).json({ securityToken: token });

    } catch (error: any) {
        console.error("Database Error:", error);
        return res.status(500).json({ error: error.message || "Something went wrong" });
    }
};

export const calculateTokens = async (req: Request, res: Response): Promise<any> => {
    const { startupId, amount } = req.body;
    try {
        const startup = await prisma.startup.findUnique({
            where: { id: startupId },
            select: {
                equity: true,
                fundingGoal: true
            }
        });

        if (!startup) {
            return res.status(404).json({ error: "Startup not found" });
        }

        const totalEquityTokens = 100;

        const { equity, fundingGoal } = startup;

        const tokenRecieved = (amount / fundingGoal) * (equity / 100) * totalEquityTokens;

        return res.status(200).json({ tokensReceived: tokenRecieved.toFixed(2) });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}