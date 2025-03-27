import prisma from "../DB/db.config";
import { Request, Response } from "express";

export const invest = async (req: Request, res: Response): Promise<any> => {
    const { investorId, userId, startupId, amount, equityTokens, txHash } = req.body;
    try {
        const investor = await prisma.investorProfile.findUnique({
            where: {
                id: investorId,
                userId: userId,
            }
        });

        const startup = await prisma.startup.findUnique({
            where: {
                id: startupId,
            }
        });

        if (!investor || !startup) {
            return res.status(404).json({ error: "Investor or Startup not found" });
        }

        const totalInvestment = investor.totalAmountInvested + amount;
        const updated = await prisma.investorProfile.update({
            where: {
                id: investorId,
                userId: userId,
            }, data: {
                totalAmountInvested: totalInvestment
            }
        });

        // if (!investor.polymeshWallet) {
        //     return res.status(400).json({ error: "Polymesh wallet not linked. Please connect your wallet before investing." });
        // }

        const investment = await prisma.investment.create({
            data: {
                investorId: investorId,
                startupId: startupId,
                amount: amount,
                equityToken: equityTokens,
                status: "Pending",
                txHash: txHash
            }
        });

        return res.status(200).json({ success: true, investment });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const investments = async (req: Request, res: Response): Promise<any> => {
    const { investorId } = req.body;
    try {
        const investments = await prisma.investment.findMany({
            where: {
                investorId: investorId
            },
            include: {
                startup: true,
            }
        });

        return res.status(200).json({ investments: investments });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: error });
    }
}

export const updateInvestment = async (req: Request, res: Response): Promise<any> => {
    const { id, status } = req.body;
    try {

        if (!["Pending", "Complete", "Refunded"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const updatedInvestment = await prisma.investment.update({
            where: {
                id: id,
            },
            data: {
                status: status,
            }
        });

        return res.status(200).json({ success: true, updatedInvestment });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const addPolymeshWallet = async (req: Request, res: Response): Promise<any> => {
    const { id, polymeshWallet } = req.body;
    try {

        const existingWallet = await prisma.investorProfile.findUnique({
            where: { polymeshWallet },
        });

        if (existingWallet) {
            return res.status(400).json({ error: "Wallet already linked to another investor" });
        }

        const updatedInvestor = await prisma.investorProfile.update({
            where: { id: id },
            data: { polymeshWallet },
        });

        return res.status(200).json({ success: true, investor: updatedInvestor });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const startupInvestments = async (req: Request, res: Response): Promise<any> => {
    const { startupId } = req.body;
    try {
        const investments = await prisma.investment.findMany({
            where: {
                startupId: startupId,
            }
        });

        const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
        const totalInvestors = investments.length;

        return res.status(200).json({ totalInvested: totalInvested, totalInvestors: totalInvestors });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const investmentData = async (req: Request, res: Response): Promise<any> => {
    const { startupId } = req.body;
    try {
        const investors = await prisma.investment.findMany({
            where: {
                startupId: startupId
            },
            select: {
                investor: {
                    select: {
                        polymeshWallet: true,
                    }
                },
                amount: true,
            }
        });

        return res.status(200).json({ investors: investors });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

export const claimTokens = async (req: Request, res: Response): Promise<any> => {
    const { investorId } = req.body;
    try {
        const investor = await prisma.investorProfile.findUnique({
            where: {
                id: investorId
            },
            select: {
                polymeshWallet: true
            },
        });

        if (!investor || !investor.polymeshWallet) {
            return res.status(404).json({ error: "Investor wallet not found" });
        }

        const distributions = await prisma.investment.findMany({
            where: { investorId },
            select: { startupId: true, amount: true, status: true },
        });

        return res.status(200).json({distributions: distributions});
    } catch (error) {
        console.log(error);
        return res.status(500).json({error:"Internal Server Error"});
    }
}