import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from "express";
import { USDC_ABI } from "../abis/usdcABI";
import Web3 from "web3";
import { Polymesh } from "@polymathnetwork/polymesh-sdk";

dotenv.config();

const polApiKey = process.env.POLPOSAMOY_API;
const infuraApiKey = process.env.INFURA_KEY;
const ethApiKey = process.env.ETHSEPOLIA_API;
const testNetChains = [11155111];

interface ChainConfig {
    url: string;
    usdcAddress: string;
}


const getChainConfig = (address: string, action: string): Record<number, ChainConfig> => ({
    // 80002: {
    //     url: `https://api-amoy.polygonscan.com/api?module=account&action=${action}&address=${address}${action === 'tokentx' ? '&contractaddress=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582' : ''}&apikey=${polApiKey}`,
    //     usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    // }, // Polygon-amoy
    11155111: {
        url: `https://api-sepolia.etherscan.io/api?module=account&action=${action}&address=${address}${action === 'tokentx' ? '&contractaddress=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' : ''}&apikey=${ethApiKey}`,
        usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    }
});



const providerListInfuria = {
    "POL": "https://polygon-mainnet.infura.io/v3/",
    "POL-AMOY": "https://polygon-amoy.infura.io/v3/",
}



export const transaction = async (req: Request, res: Response): Promise<any> => {
    const { amount, fromAddress, toAddress, currency, chainId, privateKey, contractAddress } = req.body;

    try {
        const url = "https://sepolia.infura.io/v3/a5d7e9b31d1247538827bbc14525f0a5"
        const web3 = new Web3(url);
        const fromWallet = await prisma.address.findFirst({
            where: {
                address: fromAddress,
                chainId: chainId,
                currency: currency
            }
        });

        const nativeToken = await prisma.tokenDetails.findFirst({
            where: {
                tokenAddress: "0x0000000000000000000000000000000000000000",
                chainId: chainId
            }
        })


        if (!fromWallet) {
            return res.status(404).json({
                error: "Wallet not found"
            });
        }

        const transactionCost = await getTransactionCost(url, fromAddress, toAddress, amount, contractAddress);

        if (nativeToken?.symbol !== currency) {
            const fromNative = await prisma.address.findFirst({
                where: {
                    address: fromAddress,
                    chainId: chainId,
                    currencyType: "NATIVE",
                }
            });

            if (!fromNative) {
                return res.status(404).json({
                    error: "Insufficient Balance 1"
                });
            }

            if ((fromWallet.balance - amount <= 0) && (fromNative.balance - transactionCost <= 0)) {
                return res.status(404).json({
                    error: "Insufficient Balance 2"
                });
            }
        }
        else {
            if (fromWallet.balance - (amount + transactionCost) <= 0) {
                return res.status(400).json({
                    error: "Insufficient Balance 3"
                });
            }
        }

        const amountInWei = web3.utils.toWei(amount.toString(), 'mwei');

        const txData = web3.eth.abi.encodeFunctionCall(
            {
                name: 'transfer',
                type: 'function',
                inputs: [
                    { name: '_to', type: 'address' },
                    { name: '_value', type: 'uint256' }
                ]
            },
            [toAddress, amountInWei]
        );

        const tx: any = {
            from: fromAddress,
            to: contractAddress || "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
            data: txData,
            chainId: chainId,
            nonce: await web3.eth.getTransactionCount(fromAddress, "pending"),
            gasPrice: await web3.eth.getGasPrice(),
        };

        const estimatedGas = await web3.eth.estimateGas({
            ...tx,
            value: '0x0'
        });

        tx.gas = estimatedGas;

        const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey) as unknown as {
            rawTransaction: string;
            transactionHash: string;
        };

        if (!signedTx.rawTransaction) {
            return res.status(400).json({ error: 'Signing transaction failed' });
        }

        const transactionUpdate = await prisma.transaction.create({
            data: {
                fromAddress: fromAddress,
                toAddress: toAddress,
                amount: amount,
                currency: 'USDC',
                transactionHash: signedTx.transactionHash,
                totalTxnCost: parseFloat(transactionCost),
                confirmed: false,
                chainId: chainId,
                nonce: Number(tx.nonce)
            }
        });

        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

        if (nativeToken?.symbol === currency) {
            await prisma.address.update({
                where: { id: fromWallet.id },
                data: { balance: fromWallet.balance - amount - transactionCost }
            });
        } else {
            await prisma.address.update({
                where: { id: fromWallet.id },
                data: { balance: fromWallet.balance - amount }
            });

            const fromNative = await prisma.address.findFirst({
                where: {
                    address: fromAddress,
                    chainId: chainId,
                    currencyType: "NATIVE",
                }
            });
            if (!fromNative) {
                return res.status(404).json({
                    error: "native token not found"
                });
            }

            await prisma.address.update({
                where: { id: fromNative.id },
                data: { balance: fromNative.balance - transactionCost },
            })
        }

        await prisma.transaction.update({
            where: { id: transactionUpdate.id },
            data: { confirmed: true }
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


export const updateTransaction = async (req: Request, res: Response): Promise<any> => {
    const { address } = req.body
    try {
        for (let i = 0; i < testNetChains.length; i++) {
            const chainId = testNetChains[i];
            const actions = ["tokentx", "txlist", "txlistinternal"];

            for (const action of actions) {
                const chainConfigs = getChainConfig(address, action);
                const config = chainConfigs[chainId];
                if (!config) {
                    console.error(`No configuration found for chain ${chainId}`);
                    continue;
                }

                console.log(`Fetching transaction data from: ${config.url}`);

                const response = await fetch(config.url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch data for chain ${chainId}, status: ${response.status}`);
                }

                const data = await response.json();
                console.log("--------------------------------------------")
                console.log(`Transaction data for chain ${chainId}:`, data);
                console.log("--------------------------------------------")

                if (!data?.result?.length) {
                    console.warn("No transaction data found.");
                }


                const parsedTransactions = data.result.map((txn: any) => ({
                    transactionHash: txn.hash,
                    fromAddress: txn.from,
                    toAddress: txn.to,
                    amount: parseFloat(txn.value) / Math.pow(10, parseInt(action === "tokentx" ? txn.tokenDecimal : "18")),
                    currency: action === "tokentx" ? txn.tokenName : "SEPOLIA",
                    totalTxnCost: action === "tokentx" ?
                        (parseFloat(txn.gasUsed) * parseFloat(txn.gasPrice)) /
                        Math.pow(10, 18) : 0,
                    chainId: chainId.toString(),
                    timeStamp: new Date(parseInt(txn.timeStamp) * 1000),
                    confirmed: parseInt(txn.confirmations) > 0,
                    nonce: action === "tokentx" ? parseInt(txn.nonce) : 0,
                    type: txn.from === address ? "out" : "in",
                }));


                console.log('Parsed Transactions:', parsedTransactions);

                for (const transaction of parsedTransactions) {
                    try {
                        const existingTransaction = await prisma.transaction.findUnique({
                            where: { transactionHash: transaction.transactionHash },
                        });

                        if (existingTransaction) {
                            console.log(`Transaction ${transaction.transactionHash} already exists.`);
                            continue;
                        }
                        await prisma.transaction.create({
                            data: transaction,
                        });
                        console.log(`Transaction ${transaction.transactionHash} saved successfully.`);

                        await updateBalances(transaction);
                    } catch (error) {
                        console.error(`Error saving transaction ${transaction.transactionHash}:`, error);
                    }
                }
            }
        }
        return res.status(200).json({ message: "Transaction updated successfully" });
    } catch (error) {
        console.log(error);
    }
}

const updateBalances = async (transaction: any) => {
    const { fromAddress, toAddress, amount, chainId, currency } = transaction;

    const fromAddressEntry = await prisma.address.findFirst({
        where: {
            address: { equals: fromAddress, mode: 'insensitive' },
            chainId: chainId,
            currency: currency
        }
    });
    const toAddressEntry = await prisma.address.findFirst({
        where: {
            address: { equals: toAddress, mode: 'insensitive' },
            chainId: chainId,
            currency: currency
        }
    });

    if (fromAddressEntry && toAddressEntry) {
        console.log(`Both addresses are platform wallets. Handling internal transfer.`);

        await prisma.address.update({
            where: { id: fromAddressEntry.id },
            data: { balance: { decrement: amount } },
        });

        await prisma.address.update({
            where: { id: toAddressEntry.id },
            data: { balance: { increment: amount } },
        });

        console.log(`Internal transfer processed between ${fromAddress} and ${toAddress}`);
        return;
    }

    if (fromAddressEntry) {
        await prisma.address.update({
            where: { id: fromAddressEntry.id },
            data: { balance: { decrement: amount } },
        });
        console.log(`Updated balance for sender address: ${fromAddress}`);
    }

    if (toAddressEntry) {
        await prisma.address.update({
            where: { id: toAddressEntry.id },
            data: { balance: { increment: amount } },
        });
        console.log(`Updated balance for receiver address: ${toAddress}`);
    }
}

export const getAllTransactions = async (req: Request, res: Response): Promise<any> => {
    const { address } = req.body;
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                OR: [
                    {
                        fromAddress: {
                            equals: address,
                            mode: "insensitive"
                        }
                    },
                    {
                        toAddress: {
                            equals: address,
                            mode: "insensitive"
                        }
                    }
                ]
            },
        });


        return res.status(200).json({
            transactions
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "internal server error" });
    }
}

export const getUserChainBalance = async (req: Request, res: Response): Promise<any
> => {
    const { walletId, address, chainId } = req.body;
    try {
        const wallet = await prisma.address.findFirst({
            where: {
                walletId: walletId,
                chainId: chainId,
                address: address
            }
        });
        return res.status(200).json({ balance: wallet?.balance });
    } catch (error) {
        return res.status(500).json({ error: error });
    }
}

export const createSecurityToken = async (sdk: any, name: string, ticker: string): Promise<any> => {
    const securityToken = await sdk.assets.createAsset({
        ticker,
        name,
        isDivisible: true,
    });

    console.log('Security Token Created:', securityToken);
    return securityToken;
}