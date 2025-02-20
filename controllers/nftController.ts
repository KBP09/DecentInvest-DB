import { Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

const NFT_STORAGE_API_KEY = process.env.IPFS_KEY;

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
            const response = await axios.post(
                "https://api.nft.storage/upload",
                req.file.buffer,
                {
                    headers: {
                        Authorization: `Bearer ${NFT_STORAGE_API_KEY}`,
                        "Content-Type": req.file.mimetype,
                    },
                }
            );

            const cid = response.data.value.cid;
            const ipfsUrl = `ipfs://${cid}`;

            res.status(200).json({ message: "Uploaded successfully", ipfsUrl });
        } catch (error) {
            console.error("IPFS Upload Error:", error);
            res.status(500).json({ error: "Failed to upload to IPFS" });
        }
    });
};
