import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import EbookReader from './EbookReader';

export const dynamic = 'force-dynamic';

const READABLE = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

export default async function ReadPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=/read/${orderId}`);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      buyerId: true,
      status: true,
      buyer: { select: { username: true, displayName: true } },
      items: {
        take: 1,
        select: {
          product: { select: { title: true, isDigital: true, fileUrl: true } },
        },
      },
    },
  });

  if (!order) notFound();
  if (order.buyerId !== session.user.id) notFound();
  if (!READABLE.includes(order.status)) redirect(`/orders?id=${orderId}`);

  const product = order.items[0]?.product;
  if (!product?.isDigital || !product.fileUrl) notFound();

  const buyerUsername = order.buyer?.username ?? order.buyer?.displayName ?? 'reader';

  // Detect file format from URL extension so EbookReader can pick the right renderer
  const extMatch = product.fileUrl.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
  const fileFormat = extMatch ? extMatch[1].toLowerCase() : 'pdf';

  return (
    <EbookReader
      orderId={orderId}
      productTitle={product.title}
      buyerUsername={buyerUsername}
      fileFormat={fileFormat}
    />
  );
}
