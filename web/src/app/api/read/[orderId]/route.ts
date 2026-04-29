import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

  // The fileUrl is a public Cloudinary /upload/ URL — fetch it server-side.
  // Server-to-server has no CORS or referrer restrictions, so no signing needed.
  // The raw URL is never exposed to the browser — this route is the only gateway.
  const upstream = await fetch(product.fileUrl);
  if (!upstream.ok) {
    console.error('[read] Cloudinary fetch failed:', upstream.status, product.fileUrl);
    return NextResponse.json({ error: `Could not fetch file (${upstream.status})` }, { status: 502 });
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
