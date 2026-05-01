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

function extractUrlInfo(fileUrl: string): { publicId: string; resourceType: 'raw' | 'image' | 'video' } | null {
    const match = fileUrl.match(
        /res\.cloudinary\.com\/[^/]+\/(raw|image|video)\/(?:upload|authenticated)\/(?:v\d+\/)?(.+?)(?:\?.*)?$/
    );
    if (!match) return null;
    return {
        resourceType: match[1] as 'raw' | 'image' | 'video',
        publicId: decodeURIComponent(match[2]),
    };
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

    const urlShape = product.fileUrl.replace(/^(https?:\/\/[^/]+)(.{0,60}).*$/, '$1$2...');
    console.log('[read] fileUrl shape:', urlShape);

    const urlInfo = extractUrlInfo(product.fileUrl);
    console.log('[read] publicId:', urlInfo?.publicId ?? 'not-extracted', '| resourceType:', urlInfo?.resourceType ?? 'unknown');

    let upstream: Response | null = null;

    if (urlInfo && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        const { publicId, resourceType } = urlInfo;

        // sign_url:true on res.cloudinary.com does NOT bypass access_mode:authenticated —
        // those are orthogonal Cloudinary features. The correct server-side approach is
        // private_download_url, which routes through api.cloudinary.com and authenticates
        // with API key + secret, bypassing access_mode restrictions entirely.
        //
        // For raw resources the publicId includes the file extension (e.g. "folder/file.pdf").
        // private_download_url expects (publicId_without_ext, format, options) and internally
        // reconstructs "folder/file" + ".pdf" → looks up "folder/file.pdf" in Cloudinary.
        try {
            // For raw resources, the public_id already includes the extension
            // (e.g. "folder/file.pdf"). Pass it as-is with an empty format string —
            // stripping the extension causes a 404 because Cloudinary can't find
            // "folder/file" without ".pdf" in raw storage.
            const dlUrl = cloudinary.utils.private_download_url(publicId, '', {
                resource_type: resourceType,
                type: 'upload',
                expires_at: Math.floor(Date.now() / 1000) + 300,
            });
            console.log('[read] private_download host:', new URL(dlUrl).host);
            upstream = await tryFetch(dlUrl, 'private-dl');
        } catch (err) {
            console.error('[read] private_download_url threw:', err);
        }
    }

    // Fallback: direct stored URL (works if access_mode is ever set to public)
    if (!upstream) {
        upstream = await tryFetch(product.fileUrl, 'direct');
    }

    if (!upstream) {
        console.error('[read] all attempts failed for orderId:', orderId);
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
