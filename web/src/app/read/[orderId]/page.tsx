import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { v2 as cloudinary } from 'cloudinary';
import EbookReader from './EbookReader';

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const READABLE = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
const KNOWN_FORMATS = ['pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'epub', 'mobi', 'zip', 'mp4', 'mp3'];

function extractPublicId(fileUrl: string): string | null {
  const match = fileUrl.match(/res\.cloudinary\.com\/[^/]+\/(?:raw|image|video)\/(?:upload|authenticated)\/(?:v\d+\/)?(.+)$/);
  return match ? match[1] : null;
}

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

  // Try URL extension first
  const extMatch = product.fileUrl.match(/\.([a-zA-Z0-9]{2,5})(?:\?|#|$)/);
  let fileFormat = extMatch ? extMatch[1].toLowerCase() : '';

  // If format is unknown or not a known document format, ask Cloudinary Admin API
  if (!KNOWN_FORMATS.includes(fileFormat)) {
    const rawId = extractPublicId(product.fileUrl);
    if (rawId && process.env.CLOUDINARY_API_SECRET) {
      try {
        const resource = await cloudinary.api.resource(decodeURIComponent(rawId), { resource_type: 'raw' });
        fileFormat = (resource.format as string | undefined)?.toLowerCase() ?? 'pdf';
      } catch (e) {
        console.error('[ReadPage] cloudinary.api.resource failed:', e);
        fileFormat = 'pdf';
      }
    } else {
      fileFormat = 'pdf';
    }
  }

  return (
    <EbookReader
      orderId={orderId}
      productTitle={product.title}
      buyerUsername={buyerUsername}
      fileFormat={fileFormat}
    />
  );
}
