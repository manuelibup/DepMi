import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

export const maxDuration = 60;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const DOWNLOADABLE = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

/**
 * Extract the Cloudinary public_id from any res.cloudinary.com URL.
 * Raw uploads include the file extension in the public_id.
 * Strips the version segment (v1234567890/) if present.
 */
function extractPublicId(fileUrl: string): string | null {
    const match = fileUrl.match(/res\.cloudinary\.com\/[^/]+\/(?:raw|image|video)\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)$/);
    return match ? match[1] : null;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            buyerId: true,
            status: true,
            items: {
                take: 1,
                select: { product: { select: { isDigital: true, fileUrl: true } } },
            },
        },
    });

    if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (!DOWNLOADABLE.includes(order.status)) return NextResponse.json({ error: 'Payment not confirmed' }, { status: 402 });

    const product = order.items[0]?.product;
    if (!product?.isDigital || !product.fileUrl) {
        return NextResponse.json({ error: 'No digital file' }, { status: 404 });
    }

    // Try fetching via Cloudinary signed URL first, fall back to decoded direct URL.
    // Decode publicId because stored URLs may contain %20 etc — private_download_url
    // expects the raw string, not a percent-encoded one.
    let fetchUrl = product.fileUrl;
    const rawPublicId = extractPublicId(product.fileUrl);
    const publicId = rawPublicId ? decodeURIComponent(rawPublicId) : null;

    if (publicId && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        try {
            fetchUrl = cloudinary.utils.private_download_url(publicId, '', { resource_type: 'raw' });
        } catch (err) {
            console.error('[read] private_download_url failed:', err);
        }
    }

    let upstream: Response | undefined;

    // Attempt 1: signed URL (or original if signing failed)
    try {
        const r = await fetch(fetchUrl);
        if (r.ok) {
            upstream = r;
        } else {
            console.error('[read] attempt 1 failed:', r.status, r.statusText);
        }
    } catch (err) {
        console.error('[read] attempt 1 threw:', err);
    }

    // Attempt 2: decoded direct URL (handles %20 in filenames)
    if (!upstream) {
        try {
            const decoded = decodeURIComponent(product.fileUrl);
            const r = await fetch(decoded);
            if (r.ok) {
                upstream = r;
            } else {
                console.error('[read] attempt 2 failed:', r.status, r.statusText);
            }
        } catch (err) {
            console.error('[read] attempt 2 threw:', err);
        }
    }

    // Attempt 3: original URL as-is
    if (!upstream && fetchUrl !== product.fileUrl) {
        try {
            const r = await fetch(product.fileUrl);
            if (r.ok) upstream = r;
            else console.error('[read] attempt 3 failed:', r.status);
        } catch (err) {
            console.error('[read] attempt 3 threw:', err);
        }
    }

    if (!upstream) {
        return NextResponse.json({ error: 'Could not fetch file from storage' }, { status: 502 });
    }

    const buffer = await upstream.arrayBuffer();

    const extMatch = product.fileUrl.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
    const MIME: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        epub: 'application/epub+zip',
    };
    const contentType = MIME[ext] ?? upstream.headers.get('content-type') ?? 'application/octet-stream';

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Frame-Options': 'SAMEORIGIN',
            'Content-Security-Policy': "frame-ancestors 'self'",
        },
    });
}
