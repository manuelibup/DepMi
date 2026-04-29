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
    return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL ?? 'https://depmi.com'));
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      buyerId: true,
      status: true,
      items: {
        take: 1,
        select: { product: { select: { title: true, isDigital: true, fileUrl: true } } },
      },
    },
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!DOWNLOADABLE.includes(order.status)) {
    return NextResponse.json({ error: 'Payment not confirmed yet' }, { status: 402 });
  }

  const product = order.items[0]?.product;
  if (!product?.isDigital || !product.fileUrl) {
    return NextResponse.json({ error: 'No digital file for this order' }, { status: 404 });
  }

  // Generate a short-lived signed Cloudinary download URL.
  // The private_download_url forces Content-Disposition: attachment so the browser downloads.
  let redirectUrl = product.fileUrl;
  const rawId = extractPublicId(product.fileUrl);

  if (rawId && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
    try {
      const decodedId = decodeURIComponent(rawId);

      // Derive the extension for the attachment filename
      const extMatch = product.fileUrl.match(/\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/);
      const ext = extMatch ? extMatch[1].toLowerCase() : '';
      const safeName = (product.title ?? 'download').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'download';
      const filename = ext ? `${safeName}.${ext}` : safeName;

      redirectUrl = cloudinary.utils.private_download_url(decodedId, ext, {
        resource_type: 'raw',
        attachment: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(filename ? { filename_override: filename } as any : {}),
        expires_at: Math.floor(Date.now() / 1000) + 300,
      });
    } catch (err) {
      console.error('[download] signing failed:', err);
    }
  }

  return NextResponse.redirect(redirectUrl, { status: 302 });
}
