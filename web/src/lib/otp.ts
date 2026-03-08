import { prisma } from './prisma';
import bcrypt from 'bcrypt';
import { OtpType } from '@prisma/client';

/**
 * Generates a 6-digit numeric OTP, hashes it, and saves it to the DB.
 * Returns the plain code for sending via SMS/Email.
 */
export async function generateOtp(userId: string, type: OtpType): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const saltRounds = 10;
    const codeHash = await bcrypt.hash(code, saltRounds);

    // Set expiry (default 10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Deactivate previous unused OTPs of the same type for this user
    await prisma.otpToken.updateMany({
        where: { userId, type, used: false },
        data: { used: true }
    });

    await prisma.otpToken.create({
        data: {
            userId,
            type,
            codeHash,
            expiresAt,
            used: false
        }
    });

    return code;
}

/**
 * Verifies if an OTP code is valid for a user and type.
 * Marks it as used if valid.
 */
export async function verifyOtp(userId: string, type: OtpType, code: string): Promise<boolean> {
    const token = await prisma.otpToken.findFirst({
        where: {
            userId,
            type,
            used: false,
            expiresAt: { gt: new Date() }
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!token) return false;

    const isValid = await bcrypt.compare(code, token.codeHash);

    if (isValid) {
        await prisma.otpToken.update({
            where: { id: token.id },
            data: { used: true }
        });
    }

    return isValid;
}
