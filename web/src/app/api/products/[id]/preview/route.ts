import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 1
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.images[0]?.url || null,
    });
  } catch (error) {
    console.error('[PRODUCT_PREVIEW_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
