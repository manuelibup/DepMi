import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '1200px',
                    height: '630px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0D0D0D',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Coral glow blob top-left */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-120px',
                        left: '-120px',
                        width: '480px',
                        height: '480px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,92,56,0.25) 0%, transparent 70%)',
                    }}
                />
                {/* Coral glow blob bottom-right */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-100px',
                        right: '-100px',
                        width: '400px',
                        height: '400px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(255,92,56,0.18) 0%, transparent 70%)',
                    }}
                />

                {/* Logo mark — D letterform in coral */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        marginBottom: '28px',
                    }}
                >
                    {/* Pin / dot mark */}
                    <div
                        style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50% 50% 50% 0',
                            background: 'linear-gradient(135deg, #FF5C38 0%, #FF8264 100%)',
                            transform: 'rotate(-45deg)',
                            boxShadow: '0 0 32px rgba(255,92,56,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <div
                            style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: '#0D0D0D',
                                transform: 'rotate(45deg)',
                            }}
                        />
                    </div>

                    {/* Wordmark */}
                    <span
                        style={{
                            fontSize: '80px',
                            fontWeight: 900,
                            color: '#FFFFFF',
                            letterSpacing: '-2px',
                            lineHeight: 1,
                        }}
                    >
                        Dep<span style={{ color: '#FF5C38' }}>Mi</span>
                    </span>
                </div>

                {/* Tagline */}
                <p
                    style={{
                        fontSize: '28px',
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.55)',
                        margin: 0,
                        letterSpacing: '0.5px',
                    }}
                >
                    Buy Here. Build Here. Grow Here.
                </p>

                {/* Bottom bar */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '5px',
                        background: 'linear-gradient(90deg, #FF5C38 0%, #FF8264 50%, #FF5C38 100%)',
                    }}
                />
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
