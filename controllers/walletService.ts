import prisma from "../DB/db.config";
import { ethers } from "ethers";
import * as crypto from "crypto";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv'

dotenv.config();

const sha256Hash = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
}

interface CreateWalletResponse {
    walletId: string;
    address: string;
    privateKey: string;
    seedPhrase: string;
    usdcBalances: { chainId: string; balance: number }[];
}

export const createWallet = async (email: string, password: string): Promise<CreateWalletResponse> => {
    const walletMnemonic = ethers.Wallet.createRandom().mnemonic?.phrase;
    console.log(walletMnemonic);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    if (walletMnemonic) {
        const hashedMnemonic = sha256Hash(walletMnemonic);

        const wallet = ethers.Wallet.fromPhrase(walletMnemonic);

        const usdcDetails = await prisma.tokenDetails.findMany({
            where: { symbol: "USDC" },
        })

        const usdcBalances = await getBalance(wallet.address);
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

        const addressPromises = usdcBalances.map(async (data) => {
            return await prisma.address.create({
                data: {
                    walletId: newWallet.id,
                    accountId: accountId,
                    chainId: data.chainId,
                    address: wallet.address,
                    currency: "USDC",
                    balance: data.balance,
                },
            });
        });

        await Promise.all(addressPromises);

        return {
            walletId: newWallet.id,
            address: wallet.address,
            privateKey: wallet.privateKey,
            seedPhrase: walletMnemonic,
            usdcBalances,
        };
    } else {
        throw new Error("Failed to generate wallet mnemonic.");
    }
}

const getBalance = async (walletAddress: string) => {
    const usdcDetails = await prisma.tokenDetails.findMany({
        where: { symbol: "USDC" },
    });

    const balances = await Promise.all(
        usdcDetails.map(async (details) => {
            try {
                const RPC_URL = process.env.RPC_URL;
                const provider = new ethers.JsonRpcProvider(RPC_URL);
                const contract = new ethers.Contract(
                    details.tokenAddress,
                    [
                        "function balanceOf(address account) view returns (uint256)"
                    ],
                    provider
                )
                const balance = await contract.balanceOf(walletAddress);
                const formattedBalance = Number(ethers.formatUnits(balance, details.decimals));
                return {
                    chainId: details.chainId,
                    balance: formattedBalance,
                };
            } catch (error) {
                console.error(`Error fetching balance for chain ${details.chainId}:`, error);
                return {
                    chainId: details.chainId,
                    balance: 0,
                };
            }
        })
    )
    return balances;
}