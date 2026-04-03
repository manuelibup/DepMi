import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LandingPage from '@/components/LandingPage';

export default async function WelcomePage() {
    const session = await getServerSession(authOptions);
    if (session) redirect('/');

    const [users, stores, listings] = await Promise.all([
        prisma.user.count(),
        prisma.store.count({ where: { isActive: true } }),
        prisma.product.count({ where: { inStock: true } }),
    ]);

    return <LandingPage stats={{ users, stores, listings }} />;
}
