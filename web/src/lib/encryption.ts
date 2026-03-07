import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (base64)
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a string using AES-256-GCM.
 * Returns a string formatted as "iv:authTag:encryptedContent"
 */
export function encrypt(text: string): string {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }

    const key = Buffer.from(ENCRYPTION_KEY, 'base64');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string formatted as "iv:authTag:encryptedContent".
 * If the string is not in the correct format, returns the original text (graceful fallback).
 */
export function decrypt(cipherText: string): string {
    if (!cipherText || !ENCRYPTION_KEY) return cipherText;

    const parts = cipherText.split(':');
    if (parts.length !== 3) {
        // Not in our encrypted format, likely legacy plain text
        return cipherText;
    }

    try {
        const [ivHex, authTagHex, encryptedHex] = parts;
        const key = Buffer.from(ENCRYPTION_KEY, 'base64');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption failed, returning raw text:', error);
        return cipherText;
    }
}
