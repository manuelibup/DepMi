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

    // Build a signed Cloudinary download URL so the server-side fetch always succeeds
    // regardless of whether the resource was stored as upload or authenticated delivery type.
    // This uses API key + secret to authenticate — the raw fileUrl is never sent to the browser.
    let fetchUrl = product.fileUrl;
    const publicId = extractPublicId(product.fileUrl);

    if (publicId && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        try {
            // private_download_url signs the request via api.cloudinary.com/v1_1/.../raw/download
            // Works for both upload-type (public) and authenticated-type resources.
            fetchUrl = cloudinary.utils.private_download_url(publicId, '', {
                resource_type: 'raw',
                // attachment defaults to true inside private_download_url but that only affects
                // Cloudinary's Content-Disposition — we override it in our response below.
            });
        } catch (err) {
            console.error('[read] private_download_url failed, falling back to direct URL:', err);
        }
    }

    let upstream: Response;
    try {
        upstream = await fetch(fetchUrl);
    } catch (err) {
        console.error('[read] fetch threw (network/timeout):', err);
        return NextResponse.json({ error: 'Could not reach file server' }, { status: 502 });
    }

    if (!upstream.ok) {
        console.error('[read] upstream failed:', upstream.status, upstream.statusText, fetchUrl);
        return NextResponse.json(
            { error: `Could not fetch file (upstream ${upstream.status})` },
            { status: 502 }
        );
    }

    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Frame-Options': 'SAMEORIGIN',
            'Content-Security-Policy': "frame-ancestors 'self'",
        },
    });
}
