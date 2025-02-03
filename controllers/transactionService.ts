import { error } from "console";
import prisma from "../DB/db.config";
import dotenv from 'dotenv';
import { Request, Response } from "express";

export const transaction = async (req: Request, res: Response): Promise<any> => {
    const { amount, fromAddress, toAddress, currency, chainId, privateKey, contractAddres } = req.body;

    try{
        const fromWallet = await prisma.address.findFirst({
            where:{
                address:fromAddress,
                chainId:chainId,
                currency:currency
            }
        });

        const cost = await getTransactionCost(); 
        if(!fromWallet){
            return res.status(404).json({
                error:"Wallet not found"
            });
        }


    }catch(error){

    }
}

export const getTransactionCost = async() => {

}