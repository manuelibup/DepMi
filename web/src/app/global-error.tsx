'use client';

/**
 * global-error.tsx catches errors that happen in the ROOT layout itself.
 * It must provide its own <html> and <body> tags since the layout has crashed.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body style={{
                margin: 0,
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0a0a0a',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'rgba(231, 76, 60, 0.1)',
                        border: '1px solid rgba(231, 76, 60, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                    }}>
                        ⚠️
                    </div>

                    <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                        Oops! Just a hiccup
                    </h1>

                    <p style={{ margin: 0, fontSize: '0.95rem', color: '#888', lineHeight: 1.6 }}>
                        Don't worry — nothing is broken on your end! This is a temporary glitch. A quick refresh usually fixes it.
                    </p>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button
                            onClick={reset}
                            style={{
                                background: '#059669',
                                color: '#000',
                                border: 'none',
                                padding: '12px 28px',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            🔄 Refresh
                        </button>

                        <a
                            href="/"
                            style={{
                                background: '#1a1a1a',
                                color: '#fff',
                                border: '1px solid #2a2a2a',
                                padding: '12px 28px',
                                borderRadius: '10px',
                                fontSize: '0.95rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                fontFamily: 'inherit',
                            }}
                        >
                            Go Home
                        </a>
                    </div>

                    {error.digest && (
                        <p style={{ margin: '12px 0 0', fontSize: '0.7rem', color: '#555', fontFamily: 'monospace' }}>
                            Error ID: {error.digest}
                        </p>
                    )}
                </div>
            </body>
        </html>
    );
}
