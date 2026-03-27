import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://depmi.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static pages
    const staticRoutes: MetadataRoute.Sitemap = [
        { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
        { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
        { url: `${BASE_URL}/blog/how-to-sell-safely-on-whatsapp-nigeria`, lastModified: new Date('2026-03-17'), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${BASE_URL}/blog/how-to-start-an-online-store-in-nigeria`, lastModified: new Date('2026-03-17'), changeFrequency: 'monthly', priority: 0.85 },
        { url: `${BASE_URL}/blog/how-to-buy-safely-online-nigeria`, lastModified: new Date('2026-03-17'), changeFrequency: 'monthly', priority: 0.8 },
        { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
        { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
        { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ];

    // Dynamic routes — gracefully skip if DB is unreachable
    let storeRoutes: MetadataRoute.Sitemap = [];
    let productRoutes: MetadataRoute.Sitemap = [];
    let demandRoutes: MetadataRoute.Sitemap = [];

    try {
        const [stores, products, demands] = await Promise.all([
            prisma.store.findMany({ select: { slug: true, updatedAt: true } }),
            prisma.product.findMany({ select: { id: true, slug: true, updatedAt: true } }),
            prisma.demand.findMany({ select: { id: true, slug: true, updatedAt: true } }),
        ]);
        storeRoutes = stores.map((store) => ({
            url: `${BASE_URL}/${store.slug}`,
            lastModified: store.updatedAt,
            changeFrequency: 'weekly',
            priority: 0.7,
        }));
        productRoutes = products.map((product) => ({
            url: `${BASE_URL}/p/${product.slug ?? product.id}`,
            lastModified: product.updatedAt,
            changeFrequency: 'weekly',
            priority: 0.6,
        }));
        demandRoutes = demands.map((demand) => ({
            url: `${BASE_URL}/requests/${demand.slug ?? demand.id}`,
            lastModified: demand.updatedAt,
            changeFrequency: 'weekly',
            priority: 0.7,
        }));
    } catch {
        // DB unavailable — return static routes only
    }

    return [...staticRoutes, ...storeRoutes, ...productRoutes, ...demandRoutes];
}
