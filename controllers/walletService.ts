import prisma from "../DB/db.config";
import { ethers } from "ethers";
import * as crypto from "crypto";
import bcrypt from 'bcrypt';

const sha256Hash = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export const createWallet = async (email: string, password: string) => {
    const walletMnemonic = ethers.Wallet.createRandom().mnemonic?.phrase;
    console.log(walletMnemonic);
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    if (walletMnemonic) {
        const hashedMnemonic = sha256Hash(walletMnemonic);

        const wallet = ethers.Wallet.fromPhrase(walletMnemonic);

        const newWallet = await prisma.wallet.create({
            data: {
                email: email,
                password: hashedPassword,
                hashMnemonic: hashedMnemonic,
                account: {
                    create: {
                        address: wallet.address,
                        privateKey: wallet.privateKey,
                        balance: 0,
                        currency: 'ETH'
                    }
                }
            }
        })

        return {
            walletId: newWallet.id,
            address: wallet.address,
            privateKey: wallet.privateKey,
            seedPhrase: walletMnemonic,
        };
    } else {
        throw new Error("Failed to generate wallet mnemonic.");
    }
}