import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
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
            store: {
                select: {
                    name: true,
                    storeState: true,
                    localDeliveryFee: true,
                    nationwideDeliveryFee: true,
                },
            },
        }
    });

    if (!product || !product.inStock || product.isPortfolioItem) {
        notFound();
    }

    // Product-level fee: null = use store default, number (including 0) = explicit override
    const productDeliveryFee = product.deliveryFee != null ? Number(product.deliveryFee) : null;
    const localDeliveryFee = Number(product.store.localDeliveryFee ?? 0);
    const nationwideDeliveryFee = Number(product.store.nationwideDeliveryFee ?? 0);
    const storeState = product.store.storeState ?? '';

    // Try to get user data to pre-fill phone and address
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { phoneNumber: true, address: true, city: true, state: true }
    });

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <BackButton className={styles.backBtn} />
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
                    subtotal={Number(product.price)}
                    stock={product.stock}
                    productDeliveryFee={productDeliveryFee}
                    localDeliveryFee={localDeliveryFee}
                    nationwideDeliveryFee={nationwideDeliveryFee}
                    storeState={storeState}
                    defaultPhone={user?.phoneNumber || ''}
                    defaultAddress={user?.address || ''}
                    defaultCity={user?.city || ''}
                    defaultState={user?.state || ''}
                />
            </div>
        </main>
    );
}
