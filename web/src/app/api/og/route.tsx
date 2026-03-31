import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(req: Request) {
    const origin = new URL(req.url).origin;

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

                {/* Logo lockup: pin mark + wordmark */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '28px',
                        marginBottom: '32px',
                    }}
                >
                    {/* Pin mark SVG */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`${origin}/depmi-logo.svg`}
                        width={88}
                        height={88}
                        alt=""
                    />

                    {/* Wordmark SVG — viewBox 70 191 500 250 → ~2:1 ratio */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={`${origin}/depmi-wordmark.svg`}
                        width={180}
                        height={90}
                        alt="depmi"
                    />
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
