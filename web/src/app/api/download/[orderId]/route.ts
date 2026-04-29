import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        select: { product: { select: { isDigital: true, fileUrl: true } } },
      },
    },
  });

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.buyerId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const DOWNLOADABLE = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
  if (!DOWNLOADABLE.includes(order.status)) {
    return NextResponse.json({ error: 'Payment not confirmed yet' }, { status: 402 });
  }

  const product = order.items[0]?.product;
  if (!product?.isDigital || !product.fileUrl) {
    return NextResponse.json({ error: 'No digital file for this order' }, { status: 404 });
  }

  // Proxy the file server-side — raw URL never reaches the browser
  const upstream = await fetch(product.fileUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: `Could not fetch file (${upstream.status})` }, { status: 502 });
  }

  const buffer = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="download"`,
      'Cache-Control': 'no-store',
    },
  });
}
