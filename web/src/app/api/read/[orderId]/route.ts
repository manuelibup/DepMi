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

    const urlInfo = extractUrlInfo(product.fileUrl);
    console.log('[read] orderId:', orderId, '| urlInfo:', JSON.stringify(urlInfo));

    // Attempt 1: direct fetch — works once access_mode has been set to public
    let upstream: Response | null = null;
    try {
        const r = await fetch(product.fileUrl);
        if (r.ok) { upstream = r; console.log('[read] direct OK'); }
        else console.log('[read] direct failed:', r.status);
    } catch (e) { console.error('[read] direct threw:', e); }

    // Attempt 2: resource has access_mode:authenticated. Use Admin API (Basic Auth)
    // to change it to public — the Cloudinary SDK encodes slashes as %2F in the
    // path which some endpoints reject with 403; raw fetch with literal slashes avoids that.
    if (!upstream && urlInfo && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        try {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const creds = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64');
            // Encode each path segment individually so slashes remain literal in the URL path
            const pathId = urlInfo.publicId.split('/').map(encodeURIComponent).join('/');
            const updateUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${urlInfo.resourceType}/upload/${pathId}`;

            const updateResp = await fetch(updateUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${creds}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ access_mode: 'public', invalidate: 'true' }).toString(),
            });
            console.log('[read] admin update status:', updateResp.status);

            if (updateResp.ok) {
                const updateBody = await updateResp.json().catch(() => ({}));
                console.log('[read] admin update body access_mode:', (updateBody as Record<string, unknown>).access_mode);

                // CDN propagation for access_mode changes can take minutes even with invalidate:true.
                // A Cloudinary signed URL (s--HASH-- in path) is a fresh cache key the CDN has
                // never seen → forces origin hit → origin already has access_mode:public → 200.
                const signedUrl = cloudinary.url(urlInfo.publicId, {
                    resource_type: urlInfo.resourceType,
                    sign_url: true,
                    secure: true,
                });
                console.log('[read] trying signed URL for fresh cache key');
                const sr = await fetch(signedUrl);
                if (sr.ok) {
                    upstream = sr;
                    console.log('[read] signed URL OK');
                } else {
                    console.log('[read] signed URL failed:', sr.status, '— waiting 3s for CDN propagation');
                    await new Promise(r => setTimeout(r, 3000));
                    const r2 = await fetch(product.fileUrl);
                    if (r2.ok) { upstream = r2; console.log('[read] delayed retry OK'); }
                    else console.log('[read] delayed retry failed:', r2.status);
                }
            } else {
                const errBody = await updateResp.text();
                console.error('[read] admin update failed:', updateResp.status, errBody);
            }
        } catch (err) {
            console.error('[read] admin update threw:', err);
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
