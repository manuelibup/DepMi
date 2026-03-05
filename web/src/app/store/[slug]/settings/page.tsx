import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PayoutForm from './PayoutForm';
import Link from 'next/link';

interface Props {
    params: Promise<{ slug: string }>;
}

export default async function StoreSettingsPage({ params }: Props) {
    const { slug } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) redirect(`/login?callbackUrl=/store/${slug}/settings`);

    const store = await prisma.store.findUnique({
        where: { slug },
        select: { id: true, ownerId: true, name: true, bankCode: true, bankAccountNo: true, bankAccountName: true },
    });

    if (!store) notFound();
    if (store.ownerId !== session.user.id) redirect('/');

    return (
        <main style={{ minHeight: '100dvh', background: 'var(--bg-color)', paddingBottom: '80px' }}>
            <div style={{
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--card-border)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <Link href={`/store/${slug}`} style={{ color: 'var(--text-main)', display: 'flex', flexShrink: 0 }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
                <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Store Settings
                </h1>
            </div>

            <div style={{ maxWidth: '480px', margin: '24px auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '16px',
                    padding: '20px',
                }}>
                    <p style={{ margin: '0 0 4px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Payout Account
                    </p>
                    <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        Where DepMi sends your money after a buyer confirms delivery. Your bank receives payment within minutes.
                    </p>
                    <PayoutForm
                        slug={slug}
                        initial={{
                            bankCode: store.bankCode ?? '',
                            bankAccountNo: store.bankAccountNo ?? '',
                            bankAccountName: store.bankAccountName ?? '',
                        }}
                    />
                </div>

            </div>
        </main>
    );
}
