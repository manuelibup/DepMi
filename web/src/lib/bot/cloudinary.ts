import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Download an image from a public URL (WhatsApp CDN, Instagram CDN, Twitter CDN)
 * and re-upload it to Cloudinary server-side.
 * Returns the Cloudinary secure_url.
 */
export async function uploadFromUrl(
    sourceUrl: string,
    folder = 'depmi_bot'
): Promise<string> {
    const result = await cloudinary.uploader.upload(sourceUrl, {
        folder,
        resource_type: 'image',
        fetch_format: 'auto',
        quality: 'auto',
    });
    return result.secure_url;
}
