import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Image from 'next/image';
import BackButton from '@/components/BackButton';
import ClientCheckoutForm from './ClientCheckoutForm';
import styles from './page.module.css';

export default async function CheckoutPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ variantId?: string }>;
}) {
    const { id } = await params;
    const { variantId } = await searchParams;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect('/login?callbackUrl=/checkout/' + id);
    }

    const product = await prisma.product.findUnique({
        where: { id },
        include: {
            images: true,
            variants: true,
            store: {
                select: {
                    id: true,
                    name: true,
                    storeState: true,
                    localDeliveryFee: true,
                    nationwideDeliveryFee: true,
                    dispatchEnabled: true,
                },
            },
        }
    });

    if (!product || product.isPortfolioItem) notFound();

    // Determine effective price and stock based on whether product uses variants
    let effectivePrice = Number(product.price);
    let effectiveStock = product.stock;
    let variantLabel: string | null = null;

    if (product.variants.length > 0) {
        if (!variantId) {
            redirect(`/p/${product.slug || product.id}`);
        }
        // Variant product — must have a valid in-stock variantId
        const variant = product.variants.find(v => v.id === variantId);
        if (!variant || variant.stock === 0) notFound();
        effectivePrice = Number(variant.price);
        effectiveStock = variant.stock;
        variantLabel = variant.name;
    } else {
        // No variants — check product-level inStock
        if (!product.isDigital && !product.inStock) notFound();
    }

    const productDeliveryFee = product.deliveryFee != null ? Number(product.deliveryFee) : null;
    const localDeliveryFee = Number(product.store.localDeliveryFee ?? 0);
    const nationwideDeliveryFee = Number(product.store.nationwideDeliveryFee ?? 0);
    const storeState = product.store.storeState ?? '';
    const dispatchEnabled = product.store.dispatchEnabled;

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
                            <h2 className={styles.productTitle}>{product.title}{variantLabel ? ` — ${variantLabel}` : ''}</h2>
                            <p className={styles.productPrice}>₦{effectivePrice.toLocaleString()}</p>
                        </div>
                    </div>
                </section>

                <ClientCheckoutForm
                    productId={product.id}
                    storeId={product.store.id}
                    productTitle={product.title}
                    productPrice={effectivePrice}
                    subtotal={effectivePrice}
                    stock={effectiveStock}
                    productDeliveryFee={productDeliveryFee}
                    localDeliveryFee={localDeliveryFee}
                    nationwideDeliveryFee={nationwideDeliveryFee}
                    storeState={storeState}
                    dispatchEnabled={dispatchEnabled}
                    isDigital={product.isDigital}
                    defaultPhone={user?.phoneNumber || ''}
                    defaultAddress={user?.address || ''}
                    defaultCity={user?.city || ''}
                    defaultState={user?.state || ''}
                />
            </div>
        </main>
    );
}
