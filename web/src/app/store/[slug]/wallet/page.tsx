import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import BackButton from '@/components/BackButton';
import WalletClient from './WalletClient';

export const metadata = { title: 'Crypto Wallet — DepMi' };

export default async function StoreWalletPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect('/login');

    const { slug } = await params;

    const store = await prisma.store.findUnique({
        where: { slug },
        select: { ownerId: true, cryptoWalletAddr: true, name: true },
    });

    if (!store) redirect('/store/create');
    if (store.ownerId !== session.user.id) redirect(`/store/${slug}`);

    return (
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 80px' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 24px' }}>
                <BackButton />
                <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Crypto Wallet</h1>
            </header>
            <WalletClient slug={slug} walletAddr={store.cryptoWalletAddr} />
        </main>
    );
}
