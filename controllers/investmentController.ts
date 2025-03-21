import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from "express";

export const invest = async (req: Request, res: Response): Promise<any> => {
    const { investorId, startupId, amount, equityTokens } = req.body;
    try {
        const investor = await prisma.investorProfile.findUnique({
            where: {
                id: investorId,
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

        const investment = await prisma.investment.create({
            data: {
                investorId: investorId,
                startupId: startupId,
                amount: amount,
                equityToken: equityTokens,
                status: "Pending",
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