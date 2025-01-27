import prisma from "../DB/db.config";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv'
import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { sendOtpEmail } from "./emailVerification";

dotenv.config();
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        (req as any).user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

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
        const otp = await sendOtpEmail(email);
        const newUser = await prisma.user.update({
            where: {
                email: email
            }, data: {
                otp: otp
            }
        })
        res.json({ message: 'Signup successful, Please verify your otp' });
    }
    catch (error) {
        res.status(500).json({ error: "Error during signup" });
    }
}

export const setRole = async (req: Request, res: Response): Promise<any> => {
    const { userId, role } = req.body;

    if (!["INVESTOR", "STARTUP_OWNER"].includes(role)) {
        return res.status(400).json({ error: "Invalid role!" });
    }
    try {

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
            }
        })

        if (user?.role === "INVESTOR" || user?.role === "STARTUP_OWNER") {
            return res.status(409).json({ error: 'Role is already set' })
        } 

        await prisma.user.update({
            where: { id: userId },
            data: { role: role, isFirstLogin: false },
        });

        if (role === "STARTUP_OWNER") {
            await prisma.cEOProfile.create({
                data: {
                    userId
                },
            });
        } else if (role === "INVESTOR") {
            await prisma.investorProfile.create({
                data: {
                    userId
                },
            })
        }
        return res.status(200).json({ message: `Role set to ${role}` });
    }
    catch (error) {
        return res.status(500).json({ error: 'Error updating role' });
    }
}

export const login = async (req: Request, res: Response): Promise<any> => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        })
        if (!user) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const isFirstLogin = user.isFirstLogin;

        res.status(200).json({
            message: "Login Successful",
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            },
            isFirstLogin: isFirstLogin
        });
    }
    catch (error) {
        res.status(500).json({ error: "Error during login " });
    }
}

export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
    const { email, password, otp } = req.body;
    try {

        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        })

        if (!user) {
            return res.status(404).json({ error: "user not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: "password is incorrect" });
        }

        const isFirstLogin = user.isFirstLogin;

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        if (user.otp === otp) {
            return res.status(200).json({
                message: "Verification Successful",
                accessToken,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                isFirstLogin: isFirstLogin
            });
        }
        return res.status(400).json({ error: "Invalid otp" });
    }
    catch (error) {
        return res.status(500).json({ error: "Something went wrong" });
    }
}