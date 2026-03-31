'use client';
import React, { useState } from 'react';
import Link from 'next/link';

interface Variant {
    id: string;
    name: string;
    price: number;
    stock: number;
}

export default function VariantPicker({
    productId,
    variants,
    currency,
}: {
    productId: string;
    variants: Variant[];
    currency: string;
}) {
    const [selected, setSelected] = useState<Variant>(variants[0]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Price reflecting selected variant */}
            <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>
                {currency}{selected.price.toLocaleString()}
            </p>

            {/* Variant pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {variants.map(v => (
                    <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelected(v)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '999px',
                            border: selected.id === v.id
                                ? '2px solid var(--primary)'
                                : '1.5px solid var(--card-border)',
                            background: selected.id === v.id
                                ? 'rgba(255,92,56,0.08)'
                                : 'var(--card-bg)',
                            color: selected.id === v.id ? 'var(--primary)' : 'var(--text-main)',
                            fontWeight: selected.id === v.id ? 700 : 500,
                            fontSize: '0.85rem',
                            cursor: v.stock === 0 ? 'not-allowed' : 'pointer',
                            opacity: v.stock === 0 ? 0.45 : 1,
                        }}
                        disabled={v.stock === 0}
                        title={v.stock === 0 ? 'Out of stock' : `${currency}${v.price.toLocaleString()}`}
                    >
                        {v.name}
                        {v.stock === 0 && <span style={{ marginLeft: 4, fontSize: '0.7rem' }}>✕</span>}
                    </button>
                ))}
            </div>

            {/* Buy button wired to selected variant */}
            {selected.stock > 0 ? (
                <Link
                    href={`/checkout/${productId}?variantId=${selected.id}`}
                    style={{ display: 'block', width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary) 0%, #FF8264 100%)', color: '#000', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', textAlign: 'center' }}
                >
                    Buy via Escrow
                </Link>
            ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>This variant is out of stock</p>
            )}
        </div>
    );
}
