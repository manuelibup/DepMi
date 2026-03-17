import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import styles from './article.module.css';

export const metadata: Metadata = {
    title: 'How to Sell Safely on WhatsApp in Nigeria (Without Getting Scammed) | DepMi Blog',
    description: 'WhatsApp selling in Nigeria runs on trust — and trust runs out. Here\'s how thousands of Nigerian sellers are protecting themselves and their buyers in 2026.',
    openGraph: {
        title: 'How to Sell Safely on WhatsApp in Nigeria',
        description: 'WhatsApp selling in Nigeria runs on trust — and trust runs out. Here\'s how thousands of sellers are protecting themselves in 2026.',
        type: 'article',
        publishedTime: '2026-03-17T00:00:00Z',
        authors: ['DepMi'],
        siteName: 'DepMi',
        images: [{ url: '/blog/screenshot-feed.png', width: 1200, height: 630, alt: 'DepMi feed showing buyer requests and product listings' }],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How to Sell Safely on WhatsApp in Nigeria',
        description: 'WhatsApp selling in Nigeria runs on trust — and trust runs out. Here\'s how thousands of sellers are protecting themselves in 2026.',
        images: ['/blog/screenshot-feed.png'],
    },
    alternates: {
        canonical: '/blog/how-to-sell-safely-on-whatsapp-nigeria',
    },
};

const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'How to Sell Safely on WhatsApp in Nigeria (Without Getting Scammed)',
    datePublished: '2026-03-17T00:00:00Z',
    dateModified: '2026-03-17T00:00:00Z',
    author: { '@type': 'Organization', name: 'DepMi', url: 'https://depmi.com' },
    publisher: { '@type': 'Organization', name: 'DepMi', url: 'https://depmi.com' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://depmi.com/blog/how-to-sell-safely-on-whatsapp-nigeria' },
    description: 'WhatsApp selling in Nigeria runs on trust — and trust runs out. Here\'s how thousands of Nigerian sellers are protecting themselves and their buyers in 2026.',
};

export default function Article() {
    return (
        <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <article className={styles.article}>
            <div className={styles.meta}>
                <Link href="/blog" className={styles.backLink}>← Blog</Link>
                <span className={styles.tag}>Guide · Sellers</span>
            </div>

            <h1 className={styles.title}>
                How to Sell Safely on WhatsApp in Nigeria (Without Getting Scammed)
            </h1>

            <p className={styles.byline}>
                By DepMi · March 17, 2026 · 4 min read
            </p>

            <p className={styles.lead}>
                If you sell on WhatsApp in Nigeria, you already know the fear: you ship the item,
                the buyer ghosts you. Or the buyer sends money, you ship — and the &ldquo;alert&rdquo;
                turns out to be fake.
            </p>

            <p>
                WhatsApp selling is the backbone of Nigerian commerce. But it runs entirely on trust
                between strangers, and trust runs out.
            </p>

            <h2>The core problem with WhatsApp selling</h2>

            <p>
                WhatsApp has no buyer protection. No seller protection. No dispute system. If something
                goes wrong, your only option is to call the person repeatedly and hope they pick up.
            </p>

            <p>
                This is why &ldquo;I don&rsquo;t do online&rdquo; has become a whole personality for Nigerian buyers.
                They&rsquo;ve been burned too many times — fake alerts, sellers who disappear after payment,
                buyers who claim an item never arrived just to get a refund.
            </p>

            <p>
                And the sellers who do show up and deliver? They still lose, because buyers don&rsquo;t
                trust the next seller either. The bad actors poison the whole market.
            </p>

            <h2>What smart sellers do differently</h2>

            <p>
                The sellers who scale past WhatsApp are using <strong>escrow</strong> — a system where the
                buyer&rsquo;s money is held by a neutral party until both sides confirm the deal is done.
            </p>

            <p>Here&rsquo;s how it works:</p>

            <ol>
                <li>Buyer places an order and pays</li>
                <li>Money is held securely — not released to the seller yet</li>
                <li>Seller ships the item</li>
                <li>Buyer confirms they received it in good condition</li>
                <li>Money is released to the seller</li>
            </ol>

            <p>
                Neither side can run. The buyer can&rsquo;t claim they sent money when they haven&rsquo;t.
                The seller can&rsquo;t disappear after payment. There&rsquo;s no &ldquo;I don&rsquo;t have airtime
                to call you back&rdquo; — the system holds everyone accountable.
            </p>

            <blockquote>
                Escrow doesn&rsquo;t replace trust. It makes trust unnecessary. The system is the guarantor.
            </blockquote>

            <h2>How to set this up for your WhatsApp business</h2>

            <p>
                You don&rsquo;t need to rebuild your entire business. You just need a storefront that
                handles the money part safely — while you keep selling the way you already sell.
            </p>

            <p>On DepMi, here&rsquo;s how it works:</p>

            <ol>
                <li>
                    <strong>Create your free store</strong> — takes about 10 minutes. Add your products,
                    prices, and photos.
                </li>
                <li>
                    <strong>Share your store link</strong> — put it in your WhatsApp bio, status, or send
                    it to your existing customers: <em>&ldquo;You can now order from me safely here.&rdquo;</em>
                </li>
                <li>
                    <strong>Buyers order through your storefront</strong> — every transaction is automatically
                    escrow-protected. No extra setup needed.
                </li>
                <li>
                    <strong>Ship, confirm, get paid</strong> — once the buyer confirms delivery, your money
                    goes straight to your bank.
                </li>
            </ol>

            <figure className={styles.figure}>
                <Image
                    src="/blog/screenshot-store.png"
                    alt="C_prime Gadgets store on DepMi showing phones, laptops and accessories with Deps credibility badge"
                    width={1200}
                    height={750}
                    className={styles.screenshot}
                />
                <figcaption>A real seller storefront on DepMi — credibility score, product listings, and follow button all in one place.</figcaption>
            </figure>

            <p>
                You keep selling through your network, via WhatsApp, to your loyal customers. The payment
                is just handled safely in the background.
            </p>

            <h2>The trust signal that changes everything</h2>

            <p>
                When buyers see <strong>&ldquo;Escrow Protected&rdquo;</strong> next to your store, it removes
                their biggest objection before they even message you. You&rsquo;re not asking them to
                trust you as a stranger. The system is the guarantor.
            </p>

            <figure className={styles.figure}>
                <Image
                    src="/blog/screenshot-escrow.png"
                    alt="DepMi product listing showing the Buy via Escrow button on mobile"
                    width={800}
                    height={900}
                    className={styles.screenshot}
                />
                <figcaption>Every product on DepMi has a &ldquo;Buy via Escrow&rdquo; button — buyers pay safely, sellers get paid on delivery.</figcaption>
            </figure>

            <p>
                This is why DepMi sellers report fewer abandoned conversations and more repeat buyers —
                once someone buys safely once, they come back. And they tell their friends.
            </p>

            <p>
                Your reputation on DepMi also builds over time through <strong>Deps</strong> — a credibility
                score earned through real, completed transactions. The more you sell and deliver,
                the higher your Deps score, and the more new buyers trust you on sight.
            </p>

            <h2>Buyers are already looking for sellers like you</h2>

            <figure className={styles.figure}>
                <Image
                    src="/blog/screenshot-feed.png"
                    alt="DepMi home feed showing buyer demand requests and product listings with 171 members and 44 stores"
                    width={1200}
                    height={750}
                    className={styles.screenshot}
                />
                <figcaption>Buyers post exactly what they need — sellers browse and bid. Real demand, real budgets, real locations.</figcaption>
            </figure>

            <p>
                On DepMi, buyers don&rsquo;t just browse — they post exactly what they need, with a budget
                and location. As a seller, you see a live feed of real demand. No guessing what
                people want. No paying for ads to reach them.
            </p>

            <h2>Set up your free store today</h2>

            <p>
                DepMi is free to join. Create your store, list your products, and share your link —
                your buyers are protected from the first order.
            </p>

            <div className={styles.cta}>
                <a href="/" className={styles.ctaButton}>
                    Create your free store →
                </a>
                <p className={styles.ctaNote}>
                    No monthly fees. No technical setup required.
                </p>
            </div>
        </article>
        </>
    );
}
