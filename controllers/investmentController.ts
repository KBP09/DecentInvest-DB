import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from "express";

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