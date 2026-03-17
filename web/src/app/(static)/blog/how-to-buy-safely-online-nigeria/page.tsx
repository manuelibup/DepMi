import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../article.module.css';

export const metadata: Metadata = {
    title: 'How to Buy Online Safely in Nigeria (Without Getting Scammed) | DepMi Blog',
    description: 'Online shopping scams in Nigeria are real — but so is safe online shopping. Here\'s exactly how to protect your money every time you buy online.',
    openGraph: {
        title: 'How to Buy Online Safely in Nigeria (Without Getting Scammed)',
        description: 'Online shopping scams in Nigeria are real — but so is safe online shopping. Here\'s how to protect your money every time.',
        type: 'article',
        publishedTime: '2026-03-17T00:00:00Z',
        authors: ['DepMi'],
        siteName: 'DepMi',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How to Buy Online Safely in Nigeria',
        description: 'Online shopping scams in Nigeria are real. Here\'s how to protect your money every time you buy online.',
    },
    alternates: {
        canonical: '/blog/how-to-buy-safely-online-nigeria',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Buy Online Safely in Nigeria (Without Getting Scammed)',
    datePublished: '2026-03-17T00:00:00Z',
    dateModified: '2026-03-17T00:00:00Z',
    author: { '@type': 'Organization', name: 'DepMi', url: 'https://depmi.com' },
    publisher: { '@type': 'Organization', name: 'DepMi', url: 'https://depmi.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://depmi.com/blog/how-to-buy-safely-online-nigeria' },
    description: 'Online shopping scams in Nigeria are real — but so is safe online shopping. Here\'s exactly how to protect your money every time you buy online.',
};

export default function Article() {
    return (
        <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <article className={styles.article}>
            <div className={styles.meta}>
                <Link href="/blog" className={styles.backLink}>← Blog</Link>
                <span className={styles.tag}>Guide · Buyers</span>
            </div>

            <h1 className={styles.title}>
                How to Buy Online Safely in Nigeria (Without Getting Scammed)
            </h1>

            <p className={styles.byline}>
                By DepMi · March 17, 2026 · 4 min read
            </p>

            <p className={styles.lead}>
                You&rsquo;ve heard the stories. Someone paid for a phone on Instagram and got a stone
                in a box. Someone transferred money to a seller who went silent the moment it landed.
                Someone received a completely different item and the seller blocked them.
            </p>

            <p>
                These aren&rsquo;t rare cases — they happen every day in Nigeria. But they&rsquo;re
                also entirely preventable. Here&rsquo;s how to shop online and never lose your money
                to a fake seller again.
            </p>

            <h2>The most common online shopping scams in Nigeria</h2>

            <p>
                Before you can avoid a scam, you need to recognize one. The most common patterns:
            </p>

            <ul>
                <li>
                    <strong>The ghost seller</strong> — you pay, they confirm, then disappear.
                    Phone off. DMs ignored.
                </li>
                <li>
                    <strong>The bait-and-switch</strong> — you order a premium item, you receive
                    a cheap substitute or a completely different product.
                </li>
                <li>
                    <strong>The &ldquo;pay first, collect later&rdquo; trap</strong> — seller insists
                    you pay 100% upfront before they can &ldquo;reserve&rdquo; the item. Then nothing arrives.
                </li>
                <li>
                    <strong>The fake reviews</strong> — glowing testimonials in screenshots that
                    can&rsquo;t be verified. Anyone can make those in two minutes.
                </li>
                <li>
                    <strong>The urgency play</strong> — &ldquo;only 1 left, price goes up tomorrow.&rdquo;
                    Pressure tactics designed to make you skip your own judgment.
                </li>
            </ul>

            <h2>The #1 rule: never pay directly to a stranger&rsquo;s account</h2>

            <p>
                When you transfer money directly to a seller — via bank transfer, Opay, or any
                peer-to-peer method — you have zero recourse if something goes wrong. There is no
                consumer protection. Banks will not reverse a willing transfer.
            </p>

            <p>
                The solution is <strong>escrow</strong>: a system where your money is held by a
                neutral third party until you confirm the item arrived in good condition. Only
                then does the seller get paid.
            </p>

            <blockquote>
                With escrow, you never lose your money to a ghost seller. The worst case is
                you get a full refund.
            </blockquote>

            <p>
                This is exactly how DepMi works. When you buy through a DepMi store, your payment
                is held in escrow automatically — no extra setup, no manual process. You confirm
                delivery, then the seller gets paid.
            </p>

            <h2>Red flags to watch for when shopping online</h2>

            <p>Walk away if you see:</p>

            <ul>
                <li>
                    <strong>No verifiable reviews</strong> — screenshot testimonials mean nothing.
                    Look for reviews attached to real accounts with purchase history.
                </li>
                <li>
                    <strong>Pressure to pay off-platform</strong> — if a seller asks you to send
                    money via personal transfer instead of through the checkout, that&rsquo;s a red flag.
                    Legitimate sellers don&rsquo;t need to bypass the payment system.
                </li>
                <li>
                    <strong>Prices too far below market</strong> — a ₦300,000 iPhone for ₦80,000
                    is not a deal. It&rsquo;s a scam.
                </li>
                <li>
                    <strong>No location or store history</strong> — new accounts with no transaction
                    history selling high-value items are risky.
                </li>
                <li>
                    <strong>Vague delivery terms</strong> — &ldquo;delivery in 2–4 weeks&rdquo; from an
                    unverified seller is often a stall.
                </li>
            </ul>

            <h2>What to do before you pay</h2>

            <ol>
                <li>
                    <strong>Check the seller&rsquo;s rating and history.</strong> How many completed
                    orders? How long have they been selling? What do verified buyers say?
                </li>
                <li>
                    <strong>Read the return policy.</strong> A seller with a clear return window
                    is a seller who stands behind their product.
                </li>
                <li>
                    <strong>Use a platform with built-in buyer protection.</strong> Escrow-protected
                    platforms like DepMi mean the seller only gets paid when you confirm receipt.
                </li>
                <li>
                    <strong>Pay with traceable methods only.</strong> No cash on WhatsApp. No
                    direct transfers to strangers without escrow backing it.
                </li>
            </ol>

            <h2>What to do if something goes wrong</h2>

            <p>
                If you&rsquo;ve shopped on a platform with buyer protection:
            </p>
            <ul>
                <li>Open a dispute before confirming delivery — you have a window to raise an issue.</li>
                <li>Document everything: photos, messages, the item received.</li>
                <li>Contact platform support with your evidence.</li>
            </ul>

            <p>
                If you paid directly to a stranger&rsquo;s account with no escrow protection,
                your options are limited. Report to the EFCC (<strong>efcc.gov.ng</strong>) or
                file a complaint with your bank — but recovery is not guaranteed. Prevention
                is the only reliable protection.
            </p>

            <h2>Shop safely from day one</h2>

            <p>
                On DepMi, every purchase is automatically escrow-protected. Your money is held
                until you confirm the item arrived. Sellers are rated by verified buyers. And if
                something goes wrong, there&rsquo;s a real dispute process — not a blocked number.
            </p>

            <div className={styles.cta}>
                <a href="/" className={styles.ctaButton}>
                    Start shopping safely →
                </a>
                <p className={styles.ctaNote}>
                    Free to join. Every purchase escrow-protected from day one.
                </p>
            </div>
        </article>
        </>
    );
}
