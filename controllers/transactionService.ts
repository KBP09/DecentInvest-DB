import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from "express";
import { USDC_ABI } from "../abis/usdcABI";
import Web3 from "web3";
import { error } from "console";
dotenv.config();

const web3 = new Web3("https://polygon-mainnet.g.alchemy.com/v2/OQZXKnROAEEf2josdu6PlgVFjU4rPfMn");

export const transaction = async (req: Request, res: Response): Promise<any> => {
    const { amount, fromAddress, toAddress, currency, chainId, privateKey, contractAddress } = req.body;

    try {
        const fromWallet = await prisma.address.findFirst({
            where: {
                address: fromAddress,
                chainId: chainId,
                currency: currency
            }
        });

        const transactionCost = await getTransactionCost(fromAddress, toAddress, amount, contractAddress);

        if (!fromWallet) {
            return res.status(404).json({
                error: "Wallet not found"
            });
        }

        if((fromWallet.balance - amount <= 0) && (fromWallet.balance-transactionCost)<=0){
            return res.status(400).json({
                error:"Insufficient Balance"
            });
        }

    } catch (error) {

    }
}

export const getTransactionCost = async (fromAddress: string, toAddress: string, amount: number, contractAddress: string): Promise<any> => {

    try {
        const amountInWei = web3.utils.toWei(amount, 'Mwei');

        const contract = new web3.eth.Contract(USDC_ABI, contractAddress);

        const estimateGas = await contract.methods.transfer(toAddress, amountInWei).estimateGas({ from: fromAddress });

        const gasPrice = BigInt(await web3.eth.getGasPrice());

        const gasCost = BigInt(estimateGas) * gasPrice;

        const totalTransactionCost = web3.utils.fromWei(gasCost, "ether");

        console.log(`Estimated Gas Cost: ${gasCost.toString()} wei`);
        return totalTransactionCost;
    } catch (error) {
        console.error('Error estimating gas cost:', error);
        throw new Error('Failed to estimate gas cost');
    }
}