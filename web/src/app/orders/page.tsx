import React from 'react';
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
        select: { id: true, name: true }
    });

    return (
        <main>
            <Header />
            <OrdersDashboard hasStore={!!store} storeName={store?.name} />
            <BottomNav />
        </main>
    );
}
