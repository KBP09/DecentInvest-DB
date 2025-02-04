import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from "express";
import { USDC_ABI } from "../abis/usdcABI";
import Web3 from "web3";
import { error } from "console";
dotenv.config();

const chainConfigs: { [key: number]: { rpcUrl: string; usdcAddress: string } } = {
    137: {
        rpcUrl: 'https://polygon-rpc.com',
        usdcAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
    },
    8453: {
        rpcUrl: 'https://base.org/rpc',
        usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0Ce3606eB48'
    },
    42161: {
        rpcUrl: 'https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
        usdcAddress: '0xB97EF9Af5eY9A9449Aa84174'
    }
};

export const transaction = async (req: Request, res: Response): Promise<any> => {
    const { amount, fromAddress, toAddress, currency, chainId, privateKey, contractAddress } = req.body;

    try {
        const chainConfig = chainConfigs[chainId];

        if (!chainConfig) {
            throw new Error(`Unsupported chain ID: ${chainId}`);
        }

        const { rpcUrl, usdcAddress } = chainConfig;

        const web3 = new Web3(rpcUrl);
        const fromWallet = await prisma.address.findFirst({
            where: {
                address: fromAddress,
                chainId: chainId,
                currency: currency
            }
        });

        if (!fromWallet) {
            return res.status(404).json({
                error: "Wallet not found"
            });
        }

        const transactionCost = await getTransactionCost(rpcUrl, fromAddress, toAddress, amount, contractAddress);


        if ((fromWallet.balance - amount <= 0) && (fromWallet.balance - transactionCost) <= 0) {
            return res.status(400).json({
                error: "Insufficient Balance"
            });
        }

        const amountInWei = web3.utils.toWei(amount.toString(), 'mwei');

        const tx = {
            nonce: await web3.eth.getTransactionCount(fromAddress, 'latest'),
            gasPrice: await web3.eth.getGasPrice(),
            to: contractAddress || usdcAddress,
            data: web3.eth.abi.encodeFunctionCall(
                {
                    name: 'transfer',
                    type: 'function',
                    inputs: [
                        { name: '_to', type: 'address' },
                        { name: '_value', type: 'uint256' }
                    ]
                },
                [toAddress, amountInWei]
            ),
            gas: 100000,
            chainId: chainId
        };

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey) as unknown as {
            rawTransaction: string;
            transactionHash: string;
        };

        if (!signedTx.rawTransaction) {
            return res.status(400).json({ error: 'Signing transaction failed' });
        }

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        await prisma.address.update({
            where: { id: fromWallet.id },
            data: { balance: fromWallet.balance - amount - transactionCost }
        });

        const transaction = await prisma.transaction.create({
            data: {
                fromAddress: fromAddress,
                toAddress: toAddress,
                amount: amount,
                currency: 'USDC',
                transactionHash: receipt.transactionHash.toString(),
                confirmed: false,
                chainId: chainId
            }
        });

        return res.status(200).json({
            message: "Transaction successful",
            transactionHash: receipt.transactionHash,
            transaction
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "An error occurred during the transaction" });
    }
}

export const getTransactionCost = async (rpcUrl: string, fromAddress: string, toAddress: string, amount: number, contractAddress: string): Promise<any> => {

    try {
        const web3 = new Web3(rpcUrl);
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