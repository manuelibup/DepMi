/**
 * Migrates digital product files from Cloudinary to Cloudflare R2.
 * Run after setting R2 env vars in .env.local:
 *   node scripts/migrate-digital-to-r2.js
 */

require('dotenv').config({ path: '.env.local' });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v2: cloudinary } = require('cloudinary');
const { PrismaClient } = require('@prisma/client');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const prisma = new PrismaClient();

const MIME = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    epub: 'application/epub+zip',
};

function extractPublicId(fileUrl) {
    const match = fileUrl.match(
        /res\.cloudinary\.com\/[^/]+\/(?:raw|image|video)\/(?:upload|authenticated)\/(?:v\d+\/)?(.+?)(?:\?.*)?$/
    );
    return match ? decodeURIComponent(match[1]) : null;
}

async function downloadFromCloudinary(fileUrl, publicId) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const creds = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64');

    // Try 1: Admin API download endpoint (bypasses CDN block, uses API server auth)
    const encodedId = publicId.split('/').map(encodeURIComponent).join('/');
    const apiDownloadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?public_id=${encodeURIComponent(publicId)}`;

    const ts = Math.round(Date.now() / 1000);
    const params = { public_id: publicId, timestamp: ts };
    const sig = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    const signedDownload = `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?public_id=${encodeURIComponent(publicId)}&api_key=${process.env.CLOUDINARY_API_KEY}&timestamp=${ts}&signature=${sig}`;

    console.log('  Trying signed admin download URL...');
    let resp = await fetch(signedDownload);
    if (resp.ok) return resp;

    // Try 2: Basic Auth on admin resources endpoint path
    console.log(`  Signed download failed (${resp.status}), trying Basic Auth fetch...`);
    resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/raw/upload/${encodedId}`, {
        headers: { Authorization: `Basic ${creds}` },
    });
    if (resp.ok) return resp;

    // Try 3: Direct CDN (works if access_mode was changed to public manually)
    console.log(`  Basic Auth failed (${resp.status}), trying direct CDN URL...`);
    resp = await fetch(fileUrl);
    if (resp.ok) return resp;

    return null;
}

async function migrateFile(product) {
    const { id: productId, fileUrl, title } = product;
    console.log(`\n[${productId}] "${title}"`);
    console.log(`  Cloudinary URL: ${fileUrl}`);

    const publicId = extractPublicId(fileUrl);
    if (!publicId) {
        console.log('  SKIP: Could not parse public_id from URL');
        return { productId, status: 'skipped', reason: 'unparseable URL' };
    }

    const resp = await downloadFromCloudinary(fileUrl, publicId);
    if (!resp) {
        console.log('  FAIL: All download attempts failed');
        return { productId, status: 'failed', reason: 'download failed', fileUrl };
    }

    const bytes = await resp.arrayBuffer();
    console.log(`  Downloaded: ${(bytes.byteLength / 1024).toFixed(1)} KB`);

    const extMatch = fileUrl.match(/\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'pdf';
    const key = `digital/migrated/${productId}.${ext}`;
    const contentType = MIME[ext] || resp.headers.get('content-type') || 'application/octet-stream';

    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: Buffer.from(bytes),
        ContentType: contentType,
    }));

    const newUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    console.log(`  Uploaded to R2: ${newUrl}`);

    await prisma.product.update({
        where: { id: productId },
        data: { fileUrl: newUrl },
    });

    console.log('  DB updated ✓');
    return { productId, status: 'ok', oldUrl: fileUrl, newUrl };
}

async function main() {
    console.log('=== DepMi: Cloudinary → R2 migration ===\n');

    const required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
        console.error('Missing env vars:', missing.join(', '));
        process.exit(1);
    }

    const products = await prisma.product.findMany({
        where: {
            isDigital: true,
            fileUrl: { contains: 'cloudinary.com' },
        },
        select: { id: true, title: true, fileUrl: true },
    });

    console.log(`Found ${products.length} digital product(s) with Cloudinary URLs\n`);
    if (products.length === 0) {
        console.log('Nothing to migrate.');
        process.exit(0);
    }

    const results = [];
    for (const product of products) {
        const result = await migrateFile(product);
        results.push(result);
    }

    console.log('\n=== Summary ===');
    const ok = results.filter(r => r.status === 'ok');
    const failed = results.filter(r => r.status === 'failed');
    const skipped = results.filter(r => r.status === 'skipped');
    console.log(`✓ Migrated: ${ok.length}`);
    console.log(`✗ Failed:   ${failed.length}`);
    console.log(`- Skipped:  ${skipped.length}`);

    if (failed.length > 0) {
        console.log('\nFailed files (download manually from Cloudinary Media Library and re-upload):');
        failed.forEach(f => console.log(`  Product ${f.productId}: ${f.fileUrl}`));
    }

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
