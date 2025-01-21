import { error } from "console";
import prisma from "../DB/db.config";
import dotenv from 'dotenv';
dotenv.config();
import { Request, Response } from 'express';

export const getProfile = async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                ceoProfile: true,
                investorProfile: true,
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        let profile = null;
        if (user.role === "STARTUP_OWNER" && user.ceoProfile){
            profile = user.ceoProfile;
        }
        else if(user.role === "INVESTOR" && user.investorProfile){
            profile = user.investorProfile;
        }

        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        return res.status(200).json({ profile });

    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
}