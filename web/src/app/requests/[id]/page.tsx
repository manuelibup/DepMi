import React from 'react';
import Header from '@/components/Header';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import BidActionGate from './BidActionGate';
import BidForm from './BidForm';
import styles from './RequestDetail.module.css';

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const demand = await prisma.demand.findUnique({
        where: { id: params.id },
        include: {
            user: { select: { displayName: true } },
            bids: {
                include: {
                    store: { select: { name: true, depCount: true, depTier: true } },
                    product: { select: { title: true, images: { take: 1, select: { url: true } } } }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!demand) notFound();

    const isPoster = userId === demand.userId;
    
    // Check if the current user has a store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let userStores: any[] = [];
    if (userId) {
        userStores = await prisma.store.findMany({
            where: { ownerId: userId, isActive: true },
            select: { id: true, name: true }
        });
    }
    const hasStore = userStores.length > 0;
    
    // If they have a store, fetch their products for the bid dropdown
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let storeProducts: any[] = [];
    const selectedStoreId = userStores[0]?.id; // Just pick the first store for MVP
    
    if (selectedStoreId && !isPoster) {
        storeProducts = await prisma.product.findMany({
            where: { storeId: selectedStoreId, inStock: true },
            select: { id: true, title: true, price: true }
        });
    }

    // Format text
    const timeAgo = new Date(demand.createdAt).toLocaleDateString();

    return (
        <main className={styles.container}>
            <Header />
            
            <div className={styles.content}>
                
                {/* Demand Overview */}
                <div className={styles.demandHeader}>
                    <div className={styles.posterInfo}>
                        <div className={styles.avatar}>{demand.user.displayName.substring(0, 2).toUpperCase()}</div>
                        <div>
                            <p className={styles.posterName}>{demand.user.displayName}</p>
                            <p className={styles.meta}>Looking for &bull; {timeAgo}</p>
                        </div>
                    </div>
                    <span className={styles.badge}>Demand</span>
                </div>

                <div className={styles.demandBody}>
                    <h1 className={styles.demandText}>{demand.text}</h1>
                    <div className={styles.budgetRow}>
                        <span className={styles.budgetLabel}>Budget:</span>
                        <strong className={styles.budgetValue}>₦{Number(demand.budget).toLocaleString()}</strong>
                    </div>
                    {demand.location && (
                        <p className={styles.location}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                            {demand.location}
                        </p>
                    )}
                </div>

                <div className={styles.divider} />

                {/* Bids Section */}
                <div className={styles.bidsSection}>
                   <h2 className={styles.bidsTitle}>Active Bids ({demand.bids.length})</h2>
                   
                   {/* 4 Quadrant User State Logic */}
                   {!isPoster && !hasStore && (
                       <div className={styles.buyerGate}>
                           <BidActionGate isLoggedIn={!!userId} />
                       </div>
                   )}

                   {!isPoster && hasStore && (
                       <div className={styles.vendorFormArea}>
                           <BidForm demandId={demand.id} storeId={selectedStoreId!} products={storeProducts} />
                       </div>
                   )}

                   {/* Bid List (Read Only for now, Actions added later) */}
                   <div className={styles.bidList}>
                       {demand.bids.length === 0 ? (
                           <div className={styles.emptyBids}>
                               <p>No bids yet. Be the first to offer a price!</p>
                           </div>
                       ) : (
                           demand.bids.map(bid => (
                               <div key={bid.id} className={styles.bidCard}>
                                   <div className={styles.bidHeader}>
                                       <strong>{bid.store.name}</strong>
                                       <span className={styles.bidPrice}>₦{Number(bid.amount).toLocaleString()}</span>
                                   </div>
                                   {bid.proposal && <p className={styles.bidProposal}>{bid.proposal}</p>}
                                   {bid.product && (
                                       <div className={styles.attachedProduct}>
                                           <div className={styles.productIcon}>
                                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 9 18-6"/><path d="M9 21v-6"/></svg>
                                           </div>
                                           <span>Attached: {bid.product.title}</span>
                                       </div>
                                   )}
                                   {isPoster && (
                                       <button className={styles.acceptBtn}>Accept Bid</button>
                                   )}
                               </div>
                           ))
                       )}
                   </div>
               </div>

            </div>
        </main>
    );
}
