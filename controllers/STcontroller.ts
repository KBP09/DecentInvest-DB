import { Request, Response } from "express";
import dotenv from 'dotenv';
import prisma from "../DB/db.config";

dotenv.config();

export const storeSecurityToken = async (req: Request, res: Response): Promise<any> => {
    const { startupId, ticker, tokenName, assetId, totalSupply, ownerDID, ownerPortfolioID } = req.body;
    try {
        const token = await prisma.securityToken.create({
            data: {
                startupId: startupId,
                symbol: ticker,
                tokenName: tokenName,
                totalSupply: totalSupply,
                ownerWallet: ownerDID,
                assetId: assetId,
            }
        });

        return res.status(200).json({ securityToken: token });
    } catch (error) {
        return res.status(500).json({ error: "something went wrong" });
    }
}