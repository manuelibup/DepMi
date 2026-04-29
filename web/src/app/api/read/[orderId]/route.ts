import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

export const dynamic = 'force-dynamic';

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

    // Generate a 5-minute signed Cloudinary URL and redirect the client to it.
    // This avoids server-side proxying (no Vercel→Cloudinary network hop)
    // while keeping access gated behind auth + order status checks above.
    let redirectUrl = product.fileUrl;
    const rawId = extractPublicId(product.fileUrl);

    if (rawId && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
        try {
            const decodedId = decodeURIComponent(rawId);
            redirectUrl = cloudinary.url(decodedId, {
                resource_type: 'raw',
                type: 'upload',
                sign_url: true,
                secure: true,
                expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes
            });
        } catch (err) {
            console.error('[read] cloudinary.url signing failed:', err);
        }
    }

    return NextResponse.redirect(redirectUrl, { status: 302 });
}
