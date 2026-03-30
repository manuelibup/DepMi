import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-color, #0a0a0a)',
            padding: '24px',
        }}>
            <div style={{
                maxWidth: '420px',
                width: '100%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
            }}>
                <div style={{
                    fontSize: '4rem',
                    fontWeight: 900,
                    color: 'var(--primary, #FF5C38)',
                    lineHeight: 1,
                }}>
                    404
                </div>

                <h1 style={{
                    margin: 0,
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    color: 'var(--text-main, #fff)',
                }}>
                    Page not found
                </h1>

                <p style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary, #888)',
                    lineHeight: 1.6,
                }}>
                    The page you're looking for doesn't exist or has been moved.
                </p>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <Link
                        href="/"
                        style={{
                            background: 'var(--primary, #FF5C38)',
                            color: '#000',
                            border: 'none',
                            padding: '12px 28px',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontFamily: 'inherit',
                        }}
                    >
                        Go Home
                    </Link>

                    <Link
                        href="/search"
                        style={{
                            background: 'var(--bg-elevated, #1a1a1a)',
                            color: 'var(--text-main, #fff)',
                            border: '1px solid var(--card-border, #2a2a2a)',
                            padding: '12px 28px',
                            borderRadius: '10px',
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontFamily: 'inherit',
                        }}
                    >
                        Search
                    </Link>
                </div>
            </div>
        </div>
    );
}
