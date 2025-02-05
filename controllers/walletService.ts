import prisma from "../DB/db.config";
import { ethers } from "ethers";
import * as crypto from "crypto";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv'
import Web3 from "web3";
import { CurrencyType } from "@prisma/client";

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
            const isNativeToken = token.tokenAddress==="0x0000000000000000000000000000000000000000";
            return await prisma.address.create({
                data: {
                    walletId: newWallet.id,
                    accountId: accountId,
                    chainId: token.chainId,
                    address: wallet.address,
                    tokenAddress: token.tokenAddress,
                    currency: token.symbol,
                    currencyType: isNativeToken ? CurrencyType.NATIVE: CurrencyType.TOKEN,
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
