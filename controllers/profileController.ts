import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import multer from "multer";
import { uploadToIPFS } from "./startupController";
import { Request, Response } from 'express';
dotenv.config();

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("image");

export const getProfile = async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                ceoProfile: true,
                investorProfile: {
                    include: {
                        startupsInvestedIn: {
                            include: {
                                startup: true,
                            }
                        }
                    }
                },
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
            startupDetails = user.investorProfile.startupsInvestedIn.map((investment) => investment.startup);
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

export const setProfile = async (req: Request, res: Response): Promise<any> => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ error: "File upload error", details: err.message })

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        try {
            const { userId, name, about, education, birthday, twitter, linkedin, github } = req.body;

            const profilePicCID = await uploadToIPFS(req.file.buffer, req.file.originalname);

            const profilePicture = `https://lavender-late-trout-749.mypinata.cloud/ipfs/${profilePicCID}`;

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
                            education: education,
                            profilePicture: profilePicture,
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
                            education: education,
                            profilePicture: profilePicture,
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
    });
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

export const getUserRole = async (req: Request, res: Response): Promise<any> => {
    const { userId } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: {
                id: userId
            }
        });

        const userProfile = await prisma.user.findUnique({
            where: {
                id: userId
            },
            include: {
                ceoProfile: true,
                investorProfile: true,
                startups: true,
            }
        });
        let profilePic = "";
        if (user?.role === 'STARTUP_OWNER') {
            profilePic = userProfile?.ceoProfile?.profilePicture || "";
        } else {
            profilePic = userProfile?.investorProfile?.profilePicture || "";
        }
        return res.status(200).json({ role: user?.role, profilepic: profilePic });
    } catch (error) {
        return res.status(500).json({ error: "something went wrong" });
    }
}

export const getUserProfile = async (req: Request, res: Response): Promise<any> => {
    const { userName } = req.body;
    try {
        const investorProfile = await prisma.investorProfile.findUnique({
            where: { userName },
            include: {
                user: true,
            },
        });

        if (investorProfile) {
            return res.status(200).json({
                username: investorProfile.userName,
                role: "INVESTOR",
                profile: investorProfile,
            });
        }

        const ceoProfile = await prisma.cEOProfile.findUnique({
            where: {
                userName
            },
            include: {
                user: true,
            },
        });

        if (ceoProfile) {
            return res.status(200).json({
                username: ceoProfile.userName,
                role: "CEO",
                profile: ceoProfile,
            });
        }

        return res.status(404).json({ message: "Profile not found" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "something went wrong" });
    }
}