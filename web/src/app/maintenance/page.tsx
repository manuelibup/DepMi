export const metadata = { title: 'Back soon — DepMi' };

const socialCardStyle = `
.social-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 10px;
    border: 1px solid #1a1a1a;
    background: #111;
    color: #aaa;
    text-decoration: none;
    font-size: 13px;
    transition: border-color 0.2s, color 0.2s;
}
.social-card:hover {
    border-color: #FF5C38;
    color: #fff;
}
`;

const socials = [
    {
        name: 'Instagram',
        handle: '@depmidotcom',
        url: 'https://instagram.com/depmidotcom',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
        ),
    },
    {
        name: 'X (Twitter)',
        handle: '@depmidotcom',
        url: 'https://x.com/depmidotcom',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
        ),
    },
    {
        name: 'Facebook',
        handle: 'depmidotcom',
        url: 'https://facebook.com/depmidotcom',
        icon: (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
        ),
    },
];

export default function MaintenancePage() {
    return (
        <>
        <style>{socialCardStyle}</style>
        <div style={{
            minHeight: '100vh',
            background: '#0a0a0a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#fff',
            padding: '40px 24px',
            textAlign: 'center',
        }}>
            {/* Warning icon */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: '24px' }}>
                <path d="M24 4L44 40H4L24 4Z" fill="#FF5C38" opacity="0.15" stroke="#FF5C38" strokeWidth="2"/>
                <path d="M24 18V26" stroke="#FF5C38" strokeWidth="2.5" strokeLinecap="round"/>
                <circle cx="24" cy="32" r="1.5" fill="#FF5C38"/>
            </svg>

            {/* Headline */}
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 12px' }}>
                We&apos;ll be back shortly
            </h1>
            <p style={{ fontSize: '16px', color: '#888', maxWidth: '360px', lineHeight: 1.6, margin: '0 0 40px' }}>
                DepMi is undergoing scheduled maintenance. Your data is safe and we&apos;ll be back online very soon.
            </p>

            {/* Divider */}
            <div style={{ width: '40px', height: '2px', background: '#FF5C38', borderRadius: '2px', marginBottom: '40px', opacity: 0.6 }} />

            {/* Mission statement */}
            <p style={{ fontSize: '13px', color: '#555', maxWidth: '300px', lineHeight: 1.7, margin: '0 0 40px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                The marketplace built for Africa — buy, sell, and discover faster than anywhere else.
            </p>

            {/* Social links */}
            <p style={{ fontSize: '12px', color: '#444', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Follow us while you wait
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {socials.map(({ name, handle, url, icon }) => (
                    <a
                        key={name}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="social-card"
                    >
                        {icon}
                        <span>{handle}</span>
                    </a>
                ))}
            </div>

            {/* Blog link */}
            <a
                href="/blog"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#FF5C38',
                    textDecoration: 'none',
                    marginBottom: '32px',
                    borderBottom: '1px solid #FF5C38',
                    paddingBottom: '2px',
                }}
            >
                Read our blog while you wait →
            </a>

            {/* Notify me CTA */}
            <a
                href="mailto:manuel@depmi.com?subject=Notify me when DepMi is back&body=Please notify me when DepMi is back online."
                style={{
                    display: 'inline-block',
                    padding: '12px 28px',
                    borderRadius: '10px',
                    background: '#FF5C38',
                    color: '#fff',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '40px',
                    letterSpacing: '0.02em',
                }}
            >
                Notify me when we&apos;re back
            </a>

            {/* Footer note */}
            <p style={{ fontSize: '12px', color: '#333' }}>
                Questions? DM us on Instagram{' '}
                <a href="https://instagram.com/depmidotcom" style={{ color: '#FF5C38', textDecoration: 'none' }}>
                    @depmidotcom
                </a>
            </p>
        </div>
        </>
    );
}
