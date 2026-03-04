import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Image from 'next/image';
import Link from 'next/link';
import ClientCheckoutForm from './ClientCheckoutForm';
import styles from './page.module.css';

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/checkout/' + id);
    }

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            images: true,
            store: { select: { name: true } }
        }
    });

    if (!product || !product.inStock || product.isPortfolioItem) {
        notFound();
    }

    const deliveryFee = 2500; // Mock fixed delivery fee for Phase 3 UI preview
    const total = Number(product.price) + deliveryFee;

    // Try to get user data to pre-fill phone and address
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phoneNumber: true, address: true, city: true, state: true }
    });

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <Link href={`/p/${product.id}`} className={styles.backBtn}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                    </svg>
                </Link>
                <h1 className={styles.headerTitle}>Secure Checkout</h1>
            </header>

            <div className={styles.container}>
                {/* Product Summary */}
                <section className={styles.section} style={{ padding: '16px' }}>
                    <div className={styles.productPreview}>
                        <div className={styles.productImage}>
                            {product.images && product.images.length > 0 ? (
                                <Image src={product.images[0].url} alt={product.title} width={80} height={80} style={{ objectFit: 'cover', borderRadius: '12px' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    📦
                                </div>
                            )}
                        </div>
                        <div className={styles.productInfo}>
                            <p className={styles.storeName}>{product.store.name}</p>
                            <h2 className={styles.productTitle}>{product.title}</h2>
                            <p className={styles.productPrice}>₦{Number(product.price).toLocaleString()}</p>
                        </div>
                    </div>
                </section>

                <ClientCheckoutForm 
                    productId={product.id} 
                    total={total} 
                    deliveryFee={deliveryFee} 
                    subtotal={Number(product.price)} 
                    defaultPhone={user?.phoneNumber || ''}
                    defaultAddress={user?.address || ''}
                    defaultCity={user?.city || ''}
                    defaultState={user?.state || ''}
                />
            </div>
        </main>
    );
}
