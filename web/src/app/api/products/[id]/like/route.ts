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
    const existing = await prisma.productLike.findUnique({
      where: { userId_productId: { userId, productId: id } }
    });

    if (existing) {
      await prisma.$transaction([
        prisma.productLike.delete({ where: { id: existing.id } }),
        prisma.product.update({ where: { id }, data: { likeCount: { decrement: 1 } } }),
      ]);
      return NextResponse.json({ liked: false });
    } else {
      await prisma.$transaction([
        prisma.productLike.create({ data: { userId, productId: id } }),
        prisma.product.update({ where: { id }, data: { likeCount: { increment: 1 } } }),
      ]);

      const product = await prisma.product.findUnique({
          where: { id },
          select: { title: true, store: { select: { ownerId: true } } }
      });
      
      if (product && product.store.ownerId !== userId) {
          await prisma.notification.create({
              data: {
                  userId: product.store.ownerId,
                  type: 'SYSTEM',
                  title: 'New Like',
                  body: `Someone liked your product '${product.title}'.`,
                  link: `/p/${id}`
              }
          }).catch(() => {});
      }
      
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
