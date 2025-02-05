import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from "express";
import { USDC_ABI } from "../abis/usdcABI";
import Web3 from "web3";
dotenv.config();

const polApiKey = process.env.POLPOSAMOY_API;

const testNetChains = [80001];

interface ChainConfig {
    url: string;
    usdcAddress: string;
}

const getChainConfig = (address: string): Record<number, ChainConfig> => ({
    80001: {
        url: `https://api-amoy.polygonscan.com/api?module=account&action=tokentx&contractaddress=0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582&address=${address}&page=1&offset=2&sort=asc&apikey=${polApiKey}`,
        usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    }
});



// export const transaction = async (req: Request, res: Response): Promise<any> => {
//     const { amount, fromAddress, toAddress, currency, chainId, privateKey, contractAddress } = req.body;

//     try {
//         const chainConfig = chainConfigs[chainId];

//         if (!chainConfig) {
//             throw new Error(`Unsupported chain ID: ${chainId}`);
//         }

//         const { url, usdcAddress } = chainConfig;

//         const web3 = new Web3(url);
//         const fromWallet = await prisma.address.findFirst({
//             where: {
//                 address: fromAddress,
//                 chainId: chainId,
//                 currency: currency
//             }
//         });

//         if (!fromWallet) {
//             return res.status(404).json({
//                 error: "Wallet not found"
//             });
//         }

//         const transactionCost = await getTransactionCost(url, fromAddress, toAddress, amount, contractAddress);


//         if ((fromWallet.balance - amount <= 0) && (fromWallet.balance - transactionCost) <= 0) {
//             return res.status(400).json({
//                 error: "Insufficient Balance"
//             });
//         }

//         const amountInWei = web3.utils.toWei(amount.toString(), 'mwei');

//         const tx = {
//             nonce: await web3.eth.getTransactionCount(fromAddress, 'latest'),
//             gasPrice: await web3.eth.getGasPrice(),
//             to: contractAddress || usdcAddress,
//             data: web3.eth.abi.encodeFunctionCall(
//                 {
//                     name: 'transfer',
//                     type: 'function',
//                     inputs: [
//                         { name: '_to', type: 'address' },
//                         { name: '_value', type: 'uint256' }
//                     ]
//                 },
//                 [toAddress, amountInWei]
//             ),
//             gas: 100000,
//             chainId: chainId
//         };

//         const signedTx = await web3.eth.accounts.signTransaction(tx, privateKey) as unknown as {
//             rawTransaction: string;
//             transactionHash: string;
//         };

//         if (!signedTx.rawTransaction) {
//             return res.status(400).json({ error: 'Signing transaction failed' });
//         }

//         const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

//         await prisma.address.update({
//             where: { id: fromWallet.id },
//             data: { balance: fromWallet.balance - amount - transactionCost }
//         });

//         const transaction = await prisma.transaction.create({
//             data: {
//                 fromAddress: fromAddress,
//                 toAddress: toAddress,
//                 amount: amount,
//                 currency: 'USDC',
//                 transactionHash: receipt.transactionHash.toString(),
//                 confirmed: false,
//                 chainId: chainId
//             }
//         });

//         return res.status(200).json({
//             message: "Transaction successful",
//             transactionHash: receipt.transactionHash,
//             transaction
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ error: "An error occurred during the transaction" });
//     }
// }

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


export const updateTransaction = async (address: string): Promise<any> => {
    try {
        for (let i = 0; i < testNetChains.length; i++) {
            const chainId = testNetChains[i];
            const chainConfigs = getChainConfig(address);
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
                return;
            }

            const parsedTransactions = data.result.map((txn: any) => ({
                transactionHash: txn.hash,
                fromAddress: txn.from,
                toAddress: txn.to,
                amount: parseFloat(txn.value) / Math.pow(10, parseInt(txn.tokenDecimal)),
                currency: txn.tokenName,
                totalTxnCost:
                    (parseFloat(txn.gasUsed) * parseFloat(txn.gasPrice)) /
                    Math.pow(10, 18),
                chainId: chainId,
                timeStamp: new Date(parseInt(txn.timeStamp) * 1000),
                confirmed: parseInt(txn.confirmations) > 0,
                nonce: parseInt(txn.nonce),
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
    } catch (error) {
        console.log(error);
    }
}

const updateBalances = async (transaction: any) => {
    const { fromAddress, toAddress, amount, chainId, currency } = transaction;

    const fromAddressEntry = await prisma.address.findFirst({
        where: {
            address: fromAddress,
            chainId: chainId,
            currency: currency
        }
    });

    const toAddressEntry = await prisma.address.findFirst({
        where: {
            address: toAddress,
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