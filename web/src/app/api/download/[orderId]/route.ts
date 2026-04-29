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

// Extract the Cloudinary public_id + resource_type from a secure_url.
// e.g. https://res.cloudinary.com/<cloud>/raw/upload/v123/depmi_uploads/uid/file.pdf
//   → { publicId: 'depmi_uploads/uid/file.pdf', resourceType: 'raw' }
function parseCloudinaryUrl(url: string): { publicId: string; resourceType: string } | null {
  try {
    const match = url.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
    const typeMatch = url.match(/\/(image|video|raw)\/upload\//);
    if (!match || !typeMatch) return null;
    // Strip file extension version suffix added by Cloudinary (keep the path clean)
    return { publicId: match[1], resourceType: typeMatch[1] };
  } catch {
    return null;
  }
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
      id: true,
      buyerId: true,
      status: true,
      items: {
        take: 1,
        select: {
          product: {
            select: { isDigital: true, fileUrl: true },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.buyerId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const DOWNLOADABLE = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
  if (!DOWNLOADABLE.includes(order.status)) {
    return NextResponse.json({ error: 'Payment not confirmed yet' }, { status: 402 });
  }

  const product = order.items[0]?.product;
  if (!product?.isDigital || !product.fileUrl) {
    return NextResponse.json({ error: 'No digital file for this order' }, { status: 404 });
  }

  const parsed = parseCloudinaryUrl(product.fileUrl);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid file URL' }, { status: 500 });
  }

  // Generate a signed URL valid for 5 minutes
  const signedUrl = cloudinary.url(parsed.publicId, {
    resource_type: parsed.resourceType as 'image' | 'video' | 'raw',
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60,
    type: 'upload',
  });

  return NextResponse.redirect(signedUrl, { status: 302 });
}
