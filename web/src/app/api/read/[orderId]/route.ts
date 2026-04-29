import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

const DOWNLOADABLE = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

function extractPublicId(fileUrl: string): string | null {
    const match = fileUrl.match(/res\.cloudinary\.com\/[^/]+\/(?:raw|image|video)\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)$/);
    return match ? match[1] : null;
}

async function tryFetch(url: string, label: string): Promise<Response | null> {
    try {
        const r = await fetch(url);
        if (r.ok) {
            console.log(`[read] ${label} OK (${r.status})`);
            return r;
        }
        console.error(`[read] ${label} failed: ${r.status} ${r.statusText}`);
        return null;
    } catch (err) {
        console.error(`[read] ${label} threw:`, err);
        return null;
    }
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

    // Log URL shape for debugging (no secrets, just structure)
    const urlShape = product.fileUrl.replace(/^(https?:\/\/[^/]+)(.{0,60}).*$/, '$1$2...');
    console.log('[read] fileUrl shape:', urlShape);

    const rawId = extractPublicId(product.fileUrl);
    const decodedId = rawId ? decodeURIComponent(rawId) : null;
    console.log('[read] publicId:', decodedId ?? 'not extracted');

    let upstream: Response | null = null;

    // Attempt 1: Cloudinary signed CDN URL (works for both upload + authenticated types)
    if (decodedId && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        try {
            const signedUrl = cloudinary.url(decodedId, {
                resource_type: 'raw',
                type: 'upload',
                sign_url: true,
                secure: true,
                expires_at: Math.floor(Date.now() / 1000) + 300,
            });
            upstream = await tryFetch(signedUrl, 'signed-cdn');
        } catch (err) {
            console.error('[read] cloudinary.url threw:', err);
        }
    }

    // Attempt 2: private_download_url via Cloudinary API endpoint
    if (!upstream && decodedId && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        try {
            const dlUrl = cloudinary.utils.private_download_url(decodedId, '', { resource_type: 'raw' });
            upstream = await tryFetch(dlUrl, 'private-download');
        } catch (err) {
            console.error('[read] private_download_url threw:', err);
        }
    }

    // Attempt 3: direct stored URL (decoded)
    if (!upstream) {
        const decoded = rawId ? product.fileUrl.replace(encodeURIComponent(rawId), decodedId!) : decodeURIComponent(product.fileUrl);
        upstream = await tryFetch(decoded, 'direct-decoded');
    }

    // Attempt 4: raw stored URL as-is
    if (!upstream) {
        upstream = await tryFetch(product.fileUrl, 'direct-raw');
    }

    if (!upstream) {
        console.error('[read] all fetch attempts failed for orderId:', orderId);
        return NextResponse.json({ error: 'Could not fetch file from storage' }, { status: 502 });
    }

    const buffer = await upstream.arrayBuffer();
    console.log('[read] buffer bytes:', buffer.byteLength);

    const extMatch = product.fileUrl.match(/\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/);
    const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
    const MIME: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        doc: 'application/msword',
    };
    const contentType = MIME[ext] ?? upstream.headers.get('content-type') ?? 'application/octet-stream';

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Content-Disposition': 'inline',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
    });
}
