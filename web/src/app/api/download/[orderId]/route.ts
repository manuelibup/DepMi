import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

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
        select: {
          product: { select: { title: true, isDigital: true, fileUrl: true } },
        },
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

  let fetchUrl = product.fileUrl;
  const publicId = extractPublicId(product.fileUrl);

  if (publicId && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_API_KEY) {
    try {
      fetchUrl = cloudinary.utils.private_download_url(publicId, '', { resource_type: 'raw' });
    } catch (err) {
      console.error('[download] private_download_url failed, falling back to direct URL:', err);
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(fetchUrl);
  } catch (err) {
    console.error('[download] fetch threw (network/timeout):', err);
    return NextResponse.json({ error: 'Could not reach file server' }, { status: 502 });
  }

  if (!upstream.ok) {
    console.error('[download] upstream failed:', upstream.status, upstream.statusText);
    return NextResponse.json({ error: `Could not fetch file (upstream ${upstream.status})` }, { status: 502 });
  }

  const buffer = await upstream.arrayBuffer();

  // Derive a clean filename from the product title + extension from original URL
  const extMatch = product.fileUrl.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'bin';
  const safeName = (product.title ?? 'download').replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'download';
  const filename = `${safeName}.${ext}`;

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
