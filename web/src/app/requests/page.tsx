import React from 'react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import DemandCard from '@/components/DemandCard';
import { prisma } from '@/lib/prisma';
import EmptyState from '@/components/EmptyState';
import styles from './Requests.module.css';

// Tells Next.js to always render dynamically so feed is fresh
export const dynamic = 'force-dynamic';

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const sp = await searchParams;
    const q = sp.q || '';

    // Advanced search: simple insensitive match on text or location
    const demands = (await (prisma.demand as any).findMany({
        where: {
            isActive: true,
            ...(q ? {
                OR: [
                    { text: { contains: q, mode: 'insensitive' } },
                    { location: { contains: q, mode: 'insensitive' } },
                ]
            } : {})
        },
        include: {
            user: {
                select: {
                    displayName: true,
                    username: true,
                    avatarUrl: true,
                }
            },
            images: {
                orderBy: { order: 'asc' },
                select: { url: true }
            },
            _count: {
                select: { bids: true }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    }) as any);

    return (
        <main className={styles.container}>
            <Header />

            <div className={styles.searchHeader}>
                <h1 className={styles.title}>Demand Engine</h1>
                <p className={styles.subtitle}>Browse active requests and bid with your products.</p>

                <form action="/requests" method="GET" className={styles.searchForm}>
                    <input
                        type="search"
                        name="q"
                        defaultValue={q}
                        placeholder="Search for requests..."
                        className={styles.searchInput}
                    />
                    <button type="submit" className={styles.searchBtn} aria-label="Search">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </button>
                </form>
            </div>

            <div className={styles.feed}>
                {demands.length === 0 ? (
                    <EmptyState
                        title="No requests found"
                        description={q ? `No active requests match "${q}".` : "Be the first to post a request!"}
                        actionLabel="Post a Request"
                        actionHref={`/demand/new${q ? `?q=${encodeURIComponent(q)}` : ''}`}
                    />
                ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    demands.map((demand: any, i: number) => {
                        const dData = {
                            id: demand.id,
                            username: demand.user.username ?? undefined,
                            user: demand.user.displayName,
                            initials: demand.user.displayName.substring(0, 2).toUpperCase(),
                            avatarUrl: demand.user.avatarUrl ?? null,
                            timeAgo: new Date(demand.createdAt).toLocaleDateString(),
                            text: demand.text,
                            budget: `${demand.currency}${Number(demand.budget).toLocaleString()}`,
                            bids: demand._count.bids,
                            location: demand.location ?? null,
                            images: demand.images.map((img: any) => img.url),
                            videoUrl: demand.videoUrl,
                        };
                        return (
                            <DemandCard key={demand.id} data={dData} index={i} />
                        );
                    })
                )}
            </div>

            <BottomNav />
        </main>
    );
}
