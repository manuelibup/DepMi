import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/LandingPage';

export default async function WelcomePage() {
    const session = await getServerSession(authOptions);
    if (session) redirect('/');

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [users, stores, listings, mau] = await Promise.all([
        prisma.user.count(),
        prisma.store.count({ where: { isActive: true } }),
        prisma.product.count({ where: { inStock: true } }),
        prisma.user.count({ where: { lastActiveAt: { gte: cutoff } } }),
    ]);

    return <LandingPage stats={{ users, stores, listings, mau }} />;
}
