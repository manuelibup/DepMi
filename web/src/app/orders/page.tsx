import React, { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import OrdersDashboard from './OrdersDashboard';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export default async function OrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/orders');
    }

    // Check if user owns a store to show Seller tab
    const store = await prisma.store.findFirst({
        where: { ownerId: session.user.id },
        select: { id: true, name: true, slug: true }
    });

    // Fetch real buyer orders
    const purchases = await prisma.order.findMany({
        where: { buyerId: session.user.id },
        orderBy: { createdAt: 'desc' },
        include: {
            items: {
                include: { product: { select: { id: true, title: true, images: { take: 1, orderBy: { order: 'asc' } } } } }
            },
            seller: { select: { name: true } },
            review: { select: { id: true } }
        }
    });

    // Fetch real seller orders (orders for this store)
    const sales = store ? await prisma.order.findMany({
        where: { sellerId: store.id },
        orderBy: { createdAt: 'desc' },
        include: {
            items: {
                include: { product: { select: { id: true, title: true, images: { take: 1, orderBy: { order: 'asc' } } } } }
            },
            buyer: { select: { displayName: true, username: true } }
        }
    }) : [];

    // Serialise plain fields for the client component (drops Prisma Decimals)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialise = (arr: any[]) => arr.map(o => ({
        id: o.id,
        status: o.status,
        escrowStatus: o.escrowStatus,
        total: Number(o.totalAmount),
        createdAt: o.createdAt.toISOString(),
        product: o.items?.[0]?.product ? {
            id: o.items[0].product.id,
            title: o.items[0].product.title,
            images: o.items[0].product.images,
        } : { id: '', title: 'Unknown', images: [] },
        store: o.seller,
        buyer: o.buyer,
        hasReviewed: !!o.review,
    }));

    return (
        <main>
            <Header />
            <Suspense fallback={null}>
                <OrdersDashboard
                    hasStore={!!store}
                    storeName={store?.name}
                    purchases={serialise(purchases)}
                    sales={serialise(sales)}
                />
            </Suspense>
            <BottomNav />
        </main>
    );
}
