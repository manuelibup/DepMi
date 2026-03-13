import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DemandForm from '@/app/demand/new/DemandForm';
import BackButton from '@/components/BackButton';

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
        redirect('/login');
    }

    const demand = await prisma.demand.findUnique({
        where: { id },
        include: {
            images: { orderBy: { order: 'asc' }, select: { url: true } },
        }
    });

    if (!demand) {
        notFound();
    }

    if (demand.userId !== userId) {
        redirect(`/requests/${id}`); // unauthorized to edit
    }

    const initialData = {
        id: demand.id,
        text: demand.text,
        category: demand.category,
        currency: demand.currency,
        budget: demand.budget.toString(),
        budgetMin: demand.budgetMin ? demand.budgetMin.toString() : undefined,
        location: demand.location || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        images: demand.images.map((img: any) => img.url),
        videoUrl: demand.videoUrl || undefined,
    };

    return (
        <main style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
            <div style={{ maxWidth: 600, margin: '0 auto', background: 'var(--card-bg)', minHeight: '100vh', position: 'relative' }}>
                <DemandForm defaultQuery="" initialData={initialData} />
            </div>
        </main>
    );
}
