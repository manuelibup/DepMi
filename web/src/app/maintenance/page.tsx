export const metadata = { title: 'Back soon — DepMi' };

export default function MaintenancePage() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#fff',
            padding: '24px',
            textAlign: 'center',
        }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: '24px' }}>
                <path d="M24 4L44 40H4L24 4Z" fill="#059669" opacity="0.15" stroke="#059669" strokeWidth="2"/>
                <path d="M24 18V26" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="24" cy="32" r="1.5" fill="#059669"/>
            </svg>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 12px' }}>
                We&apos;ll be back shortly
            </h1>
            <p style={{ fontSize: '16px', color: '#888', maxWidth: '360px', lineHeight: 1.6, margin: '0 0 32px' }}>
                DepMi is undergoing scheduled maintenance. Your data is safe and we&apos;ll be back online very soon.
            </p>
            <p style={{ fontSize: '13px', color: '#555' }}>
                Questions? DM us on Instagram{' '}
                <a href="https://instagram.com/depmidotcom" style={{ color: '#059669', textDecoration: 'none' }}>
                    @depmidotcom
                </a>
            </p>
        </div>
    );
}
