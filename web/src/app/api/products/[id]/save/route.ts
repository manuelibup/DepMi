import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const userId = session.user.id;

  try {
    const existing = await prisma.savedProduct.findUnique({
      where: { userId_productId: { userId, productId: id } }
    });

    if (existing) {
      await prisma.savedProduct.delete({ where: { id: existing.id } });
      return NextResponse.json({ saved: false });
    } else {
      await prisma.savedProduct.create({ data: { userId, productId: id } });
      
      const product = await prisma.product.findUnique({
          where: { id },
          select: { title: true, store: { select: { ownerId: true } } }
      });
      
      if (product && product.store.ownerId !== userId) {
          await prisma.notification.create({
              data: {
                  userId: product.store.ownerId,
                  type: 'SYSTEM',
                  title: 'Product Saved',
                  body: `Someone saved your product '${product.title}' to their wishlist.`,
                  link: `/p/${id}`
              }
          }).catch(() => {});
      }
      
      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error('Error toggling save:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
