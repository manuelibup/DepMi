'use client';

interface Props {
    slug: string;
    initialEnabled: boolean;
    initialWalletAddr: string | null;
}

export default function CryptoSettingsForm(_props: Props) {
    return (
        <div style={{ padding: '24px', borderRadius: 12, border: '1px solid var(--card-border)', marginTop: 24, color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
            Crypto payouts are coming soon.
        </div>
    );
}
