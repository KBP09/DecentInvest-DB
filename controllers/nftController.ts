import { Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import dotenv from 'dotenv';
import prisma from "../DB/db.config";
import FormData from "form-data";

dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("image");

export const uploadToIPFS = async (fileBuffer: Buffer, fileType: string) => {
    const formData = new FormData();
    formData.append("file", fileBuffer, { contentType: fileType });

    const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
            "Content-Type": "multipart/form-data",
        },
    });

    return response.data.IpfsHash;
};

const uploadMetadataToIPFS = async (metadata: object) => {
    const response = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", metadata, {
        headers: {
            pinata_api_key: process.env.PINATA_API_KEY,
            pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
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
            const { userId, ceoName, name, description, fundingGoal, companySize, otherFounder, originatedOn, whitePaper, youtubeLink, websiteLink } = req.body;

            const logoCID = await uploadToIPFS(req.file.buffer, req.file.mimetype);
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
                    fundingGoal: fundingGoal,
                    websiteLink: websiteLink,
                    ceoName: ceoName,
                    ownerId: userId,
                    companySize: companySize,
                    otherFounder: otherFounder,
                    originatedOn: originatedOn,
                    whitePaper: whitePaper,
                    youtubeLink: youtubeLink,
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

            res.status(200).json({ message: "Startup & NFT Created", newStartup, nft, logoUrl, metadataUrl });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Error creating startup' });
        }
    });
}
