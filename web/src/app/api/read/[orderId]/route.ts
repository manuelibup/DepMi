import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function parseCloudinaryUrl(url: string): { publicId: string; resourceType: string } | null {
  try {
    const match = url.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
    const typeMatch = url.match(/\/(image|video|raw)\/upload\//);
    if (!match || !typeMatch) return null;
    return { publicId: match[1], resourceType: typeMatch[1] };
  } catch {
    return null;
  }
}

const DOWNLOADABLE = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

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

  const parsed = parseCloudinaryUrl(product.fileUrl);
  if (!parsed) return NextResponse.json({ error: 'Invalid file URL' }, { status: 500 });

  // 5-minute signed URL — fetched server-side, never exposed to the browser
  const signedUrl = cloudinary.url(parsed.publicId, {
    resource_type: parsed.resourceType as 'image' | 'video' | 'raw',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    type: 'upload',
  });

  const upstream = await fetch(signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 502 });
  }

  const buffer = await upstream.arrayBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      // inline = render in viewer, not trigger a save dialog
      'Content-Disposition': 'inline',
      // Never cache — each request must be freshly authorized
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      // Only embeddable within DepMi itself
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
    },
  });
}
