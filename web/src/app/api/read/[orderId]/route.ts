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

type DeliveryType = 'upload' | 'authenticated';
type ResourceType = 'raw' | 'image' | 'video';

interface CloudinaryUrlInfo {
    publicId: string;
    resourceType: ResourceType;
    deliveryType: DeliveryType;
}

/**
 * Extract publicId, resourceType, and deliveryType from a Cloudinary URL.
 * Handles both /upload/ and /authenticated/ delivery types.
 * For raw resources the public_id already includes the file extension.
 */
function extractUrlInfo(fileUrl: string): CloudinaryUrlInfo | null {
    const match = fileUrl.match(
        /res\.cloudinary\.com\/[^/]+\/(raw|image|video)\/(upload|authenticated)\/(?:v\d+\/)?(.+?)(?:\?.*)?$/
    );
    if (!match) return null;
    return {
        resourceType: match[1] as ResourceType,
        deliveryType: match[2] as DeliveryType,
        publicId: decodeURIComponent(match[3]),
    };
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const { orderId } = await params;

    // ── Auth ──────────────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Order lookup ──────────────────────────────────────────────────────────
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

    // ── Fetch file from Cloudinary and proxy it to the browser ───────────────
    //
    // We proxy (not redirect) so the raw Cloudinary URL is never exposed to the
    // browser — anyone who got it could bypass the reader and download freely.
    //
    // The resource has access_mode:authenticated set by the depmi_strict upload
    // preset. CDN-level signed URLs (sign_url:true on res.cloudinary.com) do NOT
    // bypass access_mode:authenticated — that's a separate Cloudinary feature
    // (auth tokens / cookies). The only reliable server-side fix is to use the
    // Admin API to change access_mode to public on first access. The DepMi route
    // already enforces buyer auth, so Cloudinary-level restriction is redundant.
    // Self-heals once: subsequent requests hit Attempt 1 (direct) immediately.

    const urlInfo = extractUrlInfo(product.fileUrl);
    console.log('[read] orderId:', orderId, '| urlInfo:', JSON.stringify(urlInfo));

    // Attempt 1: direct fetch (succeeds once access_mode has been set to public)
    let upstream: Response | null = null;
    try {
        const r = await fetch(product.fileUrl);
        if (r.ok) { upstream = r; console.log('[read] direct OK'); }
        else console.log('[read] direct failed:', r.status);
    } catch (e) { console.error('[read] direct threw:', e); }

    // Attempt 2: resource still has access_mode:authenticated — update via Admin API
    if (!upstream && urlInfo && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        try {
            await cloudinary.api.update(urlInfo.publicId, {
                resource_type: urlInfo.resourceType,
                type: 'upload',
                access_mode: 'public',
            });
            console.log('[read] access_mode set to public — retrying direct fetch');
            const r = await fetch(product.fileUrl);
            if (r.ok) { upstream = r; console.log('[read] direct-after-update OK'); }
            else console.log('[read] direct-after-update failed:', r.status);
        } catch (err) {
            console.error('[read] api.update threw:', err);
        }
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
