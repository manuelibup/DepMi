import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

export async function getPresignedUploadUrl(key: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return { uploadUrl, publicUrl };
}

export async function deleteR2Object(key: string): Promise<void> {
    await r2.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
    }));
}

export function isR2Url(url: string): boolean {
    const base = process.env.R2_PUBLIC_URL;
    if (base) return url.startsWith(base);
    // Fallback: match r2.dev or cloudflarestorage.com URLs
    return url.includes('.r2.dev/') || url.includes('.cloudflarestorage.com/');
}
