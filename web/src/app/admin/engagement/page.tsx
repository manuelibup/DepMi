import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requireAdmin } from '@/lib/admin';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KpiCard from '../dashboard/KpiCard';
import styles from './page.module.css';

export default async function EngagementPage() {
    const session = await getServerSession(authOptions);
    const check = requireAdmin(session, 'MODERATOR');
    if (!check.ok) redirect('/');

    const [posts, demands, comments, postLikes, demandLikes, productLikes, bookmarks, topPosts, topDemands] =
        await Promise.all([
            prisma.post.count(),
            prisma.demand.count(),
            prisma.comment.count(),
            prisma.postLike.count(),
            prisma.demandLike.count(),
            prisma.productLike.count(),
            prisma.savedProduct.count(),
            prisma.post.findMany({
                orderBy: { likeCount: 'desc' }, take: 5,
                select: { id: true, body: true, likeCount: true, commentCount: true, createdAt: true, store: { select: { name: true } } },
            }),
            prisma.demand.findMany({
                orderBy: { viewCount: 'desc' }, take: 5,
                select: { id: true, text: true, viewCount: true, createdAt: true, user: { select: { displayName: true } } },
            }),
        ]);

    const totalLikes = postLikes + demandLikes + productLikes;

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>Engagement</h1>

            <div className={styles.kpiGrid}>
                <KpiCard label="Total Posts" value={posts.toLocaleString()}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                    color="#a855f7" />
                <KpiCard label="Total Demands" value={demands.toLocaleString()}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
                    color="#06b6d4" />
                <KpiCard label="Total Comments" value={comments.toLocaleString()}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                    color="#22c55e" />
                <KpiCard label="Total Likes" value={totalLikes.toLocaleString()}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>}
                    color="#ef4444" />
                <KpiCard label="Bookmarks" value={bookmarks.toLocaleString()}
                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>}
                    color="#f59e0b" />
            </div>

            <div className={styles.tablesGrid}>
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Top Posts (by likes)</h2>
                    <table className={styles.table}>
                        <thead><tr><th>Post</th><th>Store</th><th>Likes</th><th>Comments</th></tr></thead>
                        <tbody>
                            {topPosts.map(p => (
                                <tr key={p.id}>
                                    <td className={styles.truncate}>{p.body.slice(0, 60)}{p.body.length > 60 ? '…' : ''}</td>
                                    <td>{p.store.name}</td>
                                    <td>{p.likeCount}</td>
                                    <td>{p.commentCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Top Demands (by views)</h2>
                    <table className={styles.table}>
                        <thead><tr><th>Request</th><th>By</th><th>Views</th></tr></thead>
                        <tbody>
                            {topDemands.map(d => (
                                <tr key={d.id}>
                                    <td className={styles.truncate}>{d.text.slice(0, 60)}{d.text.length > 60 ? '…' : ''}</td>
                                    <td>{d.user.displayName}</td>
                                    <td>{d.viewCount}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
