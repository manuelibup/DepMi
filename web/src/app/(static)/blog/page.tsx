import type { Metadata } from 'next';
import Link from 'next/link';
import styles from '../static.module.css';
import blogStyles from './blog.module.css';

export const metadata: Metadata = {
    title: 'Blog | DepMi — Social Commerce for Africa',
    description: 'Guides, success stories, and insights for African entrepreneurs selling online.',
    alternates: {
        canonical: '/blog',
    },
};

const posts = [
    {
        slug: 'how-to-start-an-online-store-in-nigeria',
        title: 'How to Start an Online Store in Nigeria for Free (2026 Guide)',
        excerpt: 'You don\'t need a developer, a website, or startup capital. Here\'s the complete step-by-step guide to launching your online store in Nigeria.',
        tag: 'Guide · Sellers',
        date: 'March 17, 2026',
        readTime: '5 min read',
    },
    {
        slug: 'how-to-sell-safely-on-whatsapp-nigeria',
        title: 'How to Sell Safely on WhatsApp in Nigeria (Without Getting Scammed)',
        excerpt: 'WhatsApp selling in Nigeria runs on trust — and trust runs out. Here\'s how thousands of sellers are protecting themselves and their buyers in 2026.',
        tag: 'Guide · Sellers',
        date: 'March 17, 2026',
        readTime: '4 min read',
    },
    {
        slug: 'how-to-buy-safely-online-nigeria',
        title: 'How to Buy Online Safely in Nigeria (Without Getting Scammed)',
        excerpt: 'Online shopping scams in Nigeria are real — but so is safe online shopping. Here\'s exactly how to protect your money every time you buy.',
        tag: 'Guide · Buyers',
        date: 'March 17, 2026',
        readTime: '4 min read',
    },
];

export default function BlogPage() {
    return (
        <div className={styles.section}>
            <h1 className={styles.title}>DepMi Blog</h1>
            <p className={styles.text}>
                Guides, success stories, and insights for African entrepreneurs building their business online.
            </p>

            <div className={blogStyles.grid}>
                {posts.map((post) => (
                    <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className={blogStyles.card}
                    >
                        <span className={blogStyles.tag}>{post.tag}</span>
                        <h2 className={blogStyles.cardTitle}>{post.title}</h2>
                        <p className={blogStyles.cardExcerpt}>{post.excerpt}</p>
                        <span className={blogStyles.cardMeta}>{post.date} · {post.readTime}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
