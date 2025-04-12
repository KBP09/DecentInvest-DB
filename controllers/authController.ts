import prisma from "../DB/db.config";
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import * as jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { sendOtpEmail } from "./emailVerification";
import { createWallet } from "./walletService";

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
    const { userName, email, password } = req.body;

    try {
        const findUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        if (findUser && findUser.isVerified) {
            return res.status(400).json({ error: "email already exists" });
        }

        if (findUser && !findUser.isVerified) {
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

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = await prisma.user.create({
            data: {
                email: email,
                password: hashedPassword,
                role: null,
                userName: userName,
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
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid email' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ error: 'User not verified' });
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        const wallet = await prisma.wallet.findUnique({
            where: {
                email: email
            },
            include: {
                account: {
                    select: {
                        walletId: true,
                        address: true,
                        privateKey: true,
                        addresses: {
                            select: {
                                tokenAddress: true,
                                address: true,
                                currency: true,
                                balance: true,
                                chainId: true,
                            }
                        }
                    }
                }
            }
        })
        const isFirstLogin = user.isFirstLogin;
        const isProfileComplete = user.isProfileComplete;
        res.status(200).json({
            user: {
                userId: user.id,
                email: user.email,
                accessToken: accessToken,
                role: user.role,
                account: wallet?.account
            },
            isFirstLogin: isFirstLogin,
            isProfileComplete: isProfileComplete
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
            const updatedUser = await prisma.user.update({
                where: { email },
                data: { isVerified: true }
            });
            const resp = await createWallet(email, password);
            return res.status(200).json({
                user: {
                    userId: user.id,
                    email: user.email,
                    accessToken: accessToken,
                    role: user.role,
                    account: [resp]
                },
                isFirstLogin: isFirstLogin,
            });
        }

        return res.status(400).json({ error: "Invalid otp" });
    }
    catch (error: any) {
        console.error("Error during OTP verification:", error);
        return res.status(500).json({ error: error.message || "Internal server error" });
    }
}

export const userNameCheck = async (req: Request, res: Response): Promise<any> => {
    const { userName } = req.body;

    if (!userName || typeof userName !== "string") {
        return res.status(400).json({ message: "Username is required and must be a string" });
    }

    try {
        const existingUser = await prisma.user.findFirst({
            where: {
                userName: userName.trim(),
            },
        });


        return res.status(200).json({ exists: !!existingUser });
    } catch (error) {
        console.error("Error checking username:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};