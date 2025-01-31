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
                startups: true,
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        let profile = null;
        let startupDetails = null;
        if (user.role === "STARTUP_OWNER" && user.ceoProfile) {
            profile = user.ceoProfile;
            startupDetails = user.startups;
        }
        else if (user.role === "INVESTOR" && user.investorProfile) {
            profile = user.investorProfile;
        }

        if (!profile) {
            return res.status(404).json({ error: "Profile not found" });
        }

        return res.status(200).json({ profile, startupDetails });

    } catch (error) {
        res.status(500).json({ error: "Error fetching profile" });
    }
}

export const createStartup = async (req: Request, res: Response): Promise<any> => {
    const { userId, ceoName, name, description, fundingGoal, websiteLink } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include: { ceoProfile: true }
        });

        if (!user || !user.ceoProfile) {
            return res.status(403).json({ error: "You must be a CEO to create a startup." });
        }

        const newStartup = await prisma.startup.create({
            data: {
                name: name,
                description: description,
                fundingGoal: fundingGoal,
                websiteLink: websiteLink,
                ceoName: ceoName,
                ownerId: userId
            }
        })

        await prisma.cEOProfile.update({
            where: { userId: userId },
            data: {
                startupsCreated: { increment: 1 },
            },
        })

        return res.status(201).json({ message: 'Startup created successfully', newStartup });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error creating startup' });
    }
}

export const setProfile = async (req: Request, res: Response): Promise<any> => {
    const { email, name, about, birthday } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

    } catch (error) {


    }
}