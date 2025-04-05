import prisma from "../DB/db.config";
import { ethers } from "ethers";
import * as crypto from "crypto";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv'
import { CurrencyType } from "@prisma/client";
import { Request, Response } from "express";

dotenv.config();

const sha256Hash = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
}

interface CreateWalletResponse {
    walletId: string;
    address: string;
    privateKey: string;
    addresses: { chainId: string; balance: number; currency: string }[];
}

export const createWallet = async (email: string, password: string): Promise<CreateWalletResponse> => {
    const walletMnemonic = ethers.Wallet.createRandom().mnemonic?.phrase;
    console.log(walletMnemonic);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    if (walletMnemonic) {
        const hashedMnemonic = sha256Hash(walletMnemonic);

        const wallet = ethers.Wallet.fromPhrase(walletMnemonic);

        const tokenDetails = await prisma.tokenDetails.findMany({
        });

        const newWallet = await prisma.wallet.create({
            data: {
                email: email,
                password: hashedPassword,
                hashMnemonic: hashedMnemonic,
                account: {
                    create: {
                        address: wallet.address,
                        privateKey: wallet.privateKey,
                    },
                },
            },
            include: {
                account: true,
            },
        });

        const accountId = newWallet.account[0].id;


        // Create addresses for all supported tokens with a default balance of 0
        const addressPromises = tokenDetails.map(async (token) => {
            const isNativeToken = token.tokenAddress === "0x0000000000000000000000000000000000000000";
            return await prisma.address.create({
                data: {
                    walletId: newWallet.id,
                    accountId: accountId,
                    chainId: token.chainId,
                    address: wallet.address,
                    tokenAddress: token.tokenAddress,
                    currency: token.symbol,
                    currencyType: isNativeToken ? CurrencyType.NATIVE : CurrencyType.TOKEN,
                    balance: 0,
                },
            });
        });

        await Promise.all(addressPromises);

        const accountsWithAddresses = await prisma.account.findMany({
            where: { walletId: newWallet.id },
            include: {
                addresses: {
                    select: {
                        chainId: true,
                        balance: true,
                        tokenAddress: true,
                        currency: true,
                    },
                },
            },
        });

        const accounts = accountsWithAddresses.flatMap(account => account.addresses);

        return {
            walletId: newWallet.id,
            address: wallet.address,
            privateKey: wallet.privateKey,
            addresses: accounts,
        };
    } else {
        throw new Error("Failed to generate wallet mnemonic.");
    }
};

export const getAllTokens = async (req: Request, res: Response): Promise<any> => {
    const { address } = req.body;
    try {
        const addresses = await prisma.address.findMany({
            where: {
                address: address,
            }
        })

        return res.status(200).json({ addresses });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "An error occurred during getting the token" });
    }
}

export const getUSDCBalance = async (req: Request, res: Response): Promise<any> => {
    const { address, tokenAddress } = req.body;
    try {
        const addresses = await prisma.address.findFirst({
            where: {
                address: address,
                tokenAddress: tokenAddress,
            }
        })
        const balance = addresses?.balance;
        return res.status(200).json({ balance });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "An error occurred during getting the token" });
    }
}

export const getNativeBalance = async (req: Request, res: Response): Promise<any> => {
    const { address, chainId } = req.body;
    try {
        const addresses = await prisma.address.findFirst({
            where: {
                address: address,
                chainId: chainId,
                currencyType: "NATIVE"
            }
        });

        const balance = addresses?.balance;
        return res.status(200).json({ balance });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "An error occurred during getting the token" });
    }
}

export const storePolymeshWallet = async (req: Request, res: Response): Promise<any> => {
    const { investorId, polymeshDid } = req.body;

    try {
        const investor = prisma.investorProfile.update({
            where:{
                id: investorId
            },data:{
                polymeshWallet:polymeshDid,
            }
        });

        return res.status(200).json({message:"wallet connected successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({error:"Internal Server Error"});
    }
}