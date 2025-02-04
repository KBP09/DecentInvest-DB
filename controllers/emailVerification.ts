import express, { Request, Response } from 'express';
import nodemailer from "nodemailer";
import dotenv from 'dotenv'

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVICE || "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

const generateOTP = (): number => {
    return Math.floor(100000 + Math.random() * 900000);
};

export const sendOtpEmail = async (email: string): Promise<number> => {
    if (!email) {
        throw new Error("Email is required");
    }

    const otp = generateOTP();
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your OTP Code",
        text: `sYour OTP is: ${otp}`,
    };

    try{
        await transporter.sendMail(mailOptions);
        console.log(`OTP sent to ${email}`);
        return otp;
    }
    catch(error){
        console.log("Error sending OTP:",error);
        throw new Error('Failed to send OTP');
    }
};
