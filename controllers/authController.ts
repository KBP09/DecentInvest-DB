import prisma from "../DB/db.config";
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';

export const signup = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;

    try {
        const findUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (findUser) {
            return res.status(400).json({ error: "email already exists" });
        }
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
                role: null
            }
        })
        res.json({ message: 'Signup successful, select your role.', userId: user.id });
    }
    catch (error) {
        res.status(500).json({ error: "Error during signup" });
    }
}