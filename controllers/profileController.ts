import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from 'express';
dotenv.config();

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

export const publicProfile = async (req: Request, res: Response): Promise<any> => {
    const { profileId } = req.params;

    try {
        const { id } = req.params;
        const user = await prisma.user.findUnique({
            where: { id },
            include: {
                ceoProfile: true,
                investorProfile: true,
                startups: true,
            }
        });

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};



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
        });

        await prisma.cEOProfile.update({
            where: { userId: userId },
            data: {
                startupsCreated: { increment: 1 },
            },
        });
        return res.status(201).json({ message: 'Startup created successfully', newStartup });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error creating startup' });
    }
}

export const setProfile = async (req: Request, res: Response): Promise<any> => {
    const { userId, name, about, birthday, twitter, linkedin, github } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            }
        });

        if (user?.isProfileComplete === false) {
            if (user.role === 'STARTUP_OWNER') {
                const ceoProfile = await prisma.cEOProfile.create({
                    data: {
                        user: {
                            connect: { id: userId },
                        },
                        ceoName: name,
                        about: about,
                        birthday: birthday,
                        twitter: twitter,
                        linkedin: linkedin,
                        github: github
                    }
                });

                const update = await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        isProfileComplete: true
                    }
                });

                return res.status(200).json({ ceoProfile });
            } else if (user.role === 'INVESTOR') {
                const investorProfile = await prisma.investorProfile.create({
                    data: {
                        user: {
                            connect: { id: userId },
                        },
                        investorName: name,
                        about: about,
                        birthday: birthday,
                    }
                });
                const update = await prisma.user.update({
                    where: {
                        id: userId,
                    },
                    data: {
                        isProfileComplete: true
                    }
                });
                return res.status(200).json({ investorProfile });
            }

            return res.status(400).json({ message: "something went wrong" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error creating profile' });
    }
}

export const profileCheck = async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        })
        return res.status(200).json(user?.isProfileComplete);
    } catch (error) {
        return res.status(500).json({ error: "something went wrong" });
    }
}

export const getAllStartup = async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.body;

    try {
        const startup = await prisma.startup.findMany({
            where: {
                ownerId: userId,
            }
        });

        return res.status(200).json(startup);
    } catch (error) {
        return res.status(500).json({ error: "something went wrong" });
    }
}