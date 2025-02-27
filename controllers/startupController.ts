import { Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import dotenv from 'dotenv';
import prisma from "../DB/db.config";
import FormData from "form-data";
import { promises } from "dns";

dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("image");

export const uploadToIPFS = async (fileBuffer: Buffer, filename: string) => {
    const formData = new FormData();
    formData.append("file", fileBuffer, { filename: filename });

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_API_KEY,
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data.IpfsHash;
};

const uploadMetadataToIPFS = async (metadata: object) => {
    const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", metadata, {
        headers: {
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
    });
    return response.data.IpfsHash;
};

export const createStartup = async (req: Request, res: Response): Promise<any> => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ error: "File upload error", details: err.message });

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const { userId, ceoName, name, description, fundingGoal, companySize, otherFounder, originatedOn, youtubeLink, websiteLink, industry, problem, revenueModel, equity} = req.body;

            const logoCID = await uploadToIPFS(req.file.buffer, req.file.originalname);
            const logoUrl = `https://lavender-late-trout-749.mypinata.cloud/ipfs/${logoCID}`;

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
                    fundingGoal: parseInt(fundingGoal),
                    equity:equity,
                    industry:industry,
                    problem:problem,
                    revenueModel:revenueModel,
                    websiteLink: websiteLink,
                    ceoName: ceoName,
                    ownerId: userId,
                    companySize: parseInt(companySize),
                    otherFounder: otherFounder,
                    originatedOn: originatedOn,
                    youtubeLink: youtubeLink,
                    logoLink: logoUrl,
                }
            });

            const metadata = {
                name,
                description,
                image: logoUrl,
                attributes: [{ trait_type: "Funding Goal", value: fundingGoal }],
            };

            const metadataCID = await uploadMetadataToIPFS(metadata);
            const metadataUrl = `https://lavender-late-trout-749.mypinata.cloud/ipfs/${metadataCID}`;

            const nft = await prisma.nFT.create({
                data: {
                    startupId: newStartup.id,
                    imageCID: logoCID,
                    metadataCID,
                    status: "pending",
                },
            });

            await prisma.cEOProfile.update({
                where: { userId: userId },
                data: {
                    startupsCreated: { increment: 1 },
                },
            });

            res.status(200).json({ newStartup, nft, logoUrl, metadataUrl });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error creating startup' });
        }
    });
}

export const updateNFT = async (req: Request, res: Response) => {
    try {
        const { startupId, txHash, userAddress } = req.body;

        await prisma.nFT.update({
            where: { startupId },
            data: {
                txHash,
                owner: userAddress,
                status: "minted",
            },
        });

        res.status(200).json({ message: "NFT Record Updated", txHash });
    } catch (error) {
        console.error("Error updating NFT:", error);
        res.status(500).json({ error: "Failed to update NFT" });
    }
};

export const getStartup = async (req: Request, res: Response): Promise<any> => {
    try {
        const { startupId } = req.params;

        if (!startupId) {
            return res.status(400).json({ error: "Startup id is required" });
        }

        const startup = await prisma.startup.findUnique({
            where: {
                id: startupId
            },
        });

        if (!startup) {
            return res.status(404).json({ error: "Startup not found" });
        }

        res.status(200).json(startup);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

export const getAllStartup = async (req: Request, res: Response): Promise<any> => {
    try {
        const startups = await prisma.startup.findMany({
            where: {
                isMinted: true,
            },
            select:{
                id:true,
                name:true,
                description:true,
                logoLink:true,
                createdAt:true,
            }
        });

        res.status(200).json(startups);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}