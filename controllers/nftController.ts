import { Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import dotenv from 'dotenv';
import FormData from "form-data";

dotenv.config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("image");

export const uploadImage = async (req: Request, res: Response): Promise<any> => {
    upload(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ error: "File upload error", details: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        try {
            const formData = new FormData();
            formData.append("file", req.file.buffer, { filename: req.file.originalname });

            const pinataResponse = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                formData,
                {
                    headers: {
                        "pinata_api_key": PINATA_API_KEY!,
                        "pinata_secret_api_key": PINATA_SECRET_API_KEY!,
                        ...formData.getHeaders(),
                    },
                }
            );

            const ipfsHash = pinataResponse.data.IpfsHash;
            const ipfsUrl = `https://lavender-late-trout-749.mypinata.cloud/ipfs/${ipfsHash}`;

            res.status(200).json({ message: "Uploaded successfully", ipfsUrl });
        } catch (error: any) {
            console.error("IPFS Upload Error:", error.response?.data || error.message);
            res.status(500).json({ error: "Failed to upload to IPFS" });
        }
    });
};
