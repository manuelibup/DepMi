import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

/**
 * STANDALONE ROTATION SCRIPT
 * 
 * Usage: 
 * OLD_KEY="..." NEW_KEY="..." npx ts-node scripts/rotate-key.ts
 */

const OLD_KEY = process.env.OLD_KEY;
const NEW_KEY = process.env.NEW_KEY;

if (!OLD_KEY || !NEW_KEY) {
    console.error('Error: Please provide OLD_KEY and NEW_KEY environment variables.');
    process.exit(1);
}

const ALGORITHM = 'aes-256-gcm';

function decrypt(cipherText: string, keyBase64: string): string {
    if (!cipherText) return cipherText;
    const parts = cipherText.split(':');
    if (parts.length !== 3) return cipherText;

    try {
        const [ivHex, authTagHex, encryptedHex] = parts;
        const key = Buffer.from(keyBase64, 'base64');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return cipherText;
    }
}

function encrypt(text: string, keyBase64: string): string {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

const prisma = new PrismaClient();

async function rotate() {
    console.log('Starting encryption key rotation...');

    // 1. Rotate User PII
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { phoneNumber: { contains: ':' } },
                { address: { contains: ':' } }
            ]
        }
    });

    console.log(`Rotating sensitive data for ${users.length} users...`);
    for (const user of users) {
        const updates: any = {};
        if (user.phoneNumber) updates.phoneNumber = encrypt(decrypt(user.phoneNumber, OLD_KEY), NEW_KEY);
        if (user.address) updates.address = encrypt(decrypt(user.address, OLD_KEY), NEW_KEY);
        
        await prisma.user.update({
            where: { id: user.id },
            data: updates
        });
    }

    // 2. Rotate Message Text
    const messages = await prisma.message.findMany({
        where: { text: { contains: ':' } }
    });

    console.log(`Rotating ${messages.length} messages...`);
    for (const msg of messages) {
        if (msg.text) {
            await prisma.message.update({
                where: { id: msg.id },
                data: { text: encrypt(decrypt(msg.text, OLD_KEY), NEW_KEY) }
            });
        }
    }

    console.log('Rotation complete! Remember to update your .env/.env.local with the NEW_KEY.');
}

rotate()
    .catch(e => {
        console.error('Rotation failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
