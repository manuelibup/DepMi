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
            product: {
                select: { title: true, images: { take: 1, orderBy: { order: 'asc' } } }
            },
            store: { select: { name: true } }
        }
    });

    // Fetch real seller orders (orders for this store)
    const sales = store ? await prisma.order.findMany({
        where: { storeId: store.id },
        orderBy: { createdAt: 'desc' },
        include: {
            product: {
                select: { title: true, images: { take: 1, orderBy: { order: 'asc' } } }
            },
            buyer: { select: { displayName: true, username: true } }
        }
    }) : [];

    // Serialise Decimal + Date fields for the client component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serialise = (arr: any[]) => arr.map(o => ({
        ...o,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
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
