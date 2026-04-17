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
                        display: 'flex',
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
                        display: 'flex',
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
                    {/* Pin mark SVG - Inlined to save origin fetch */}
                    <svg width="88" height="88" viewBox="0 0 1000 1000" fill="none">
                        <g fill="#FF5C38">
                            <path fill-rule="evenodd" d="M 323.22 676.78 L 500 853.55 L 676.78 676.78 A 250 250 0 1 0 323.22 676.78 Z M 500 360 A 140 140 0 0 1 500 640 A 140 140 0 0 1 500 360 Z" />
                            <rect x="640" y="50" width="110" height="450" />
                            <circle cx="500" cy="500" r="55" />
                        </g>
                    </svg>

                    {/* Wordmark SVG - Inlined to save origin fetch */}
                    <svg width="180" height="90" viewBox="70 191 500 250" fill="#FF5C38">
                        <path fill-rule="evenodd" d="M 124.5,275 A 44.5,44.5 0 1,0 124.5,364 A 44.5,44.5 0 1,0 124.5,275 Z M 124.5,298 A 21.5,21.5 0 1,1 124.5,341 A 21.5,21.5 0 1,1 124.5,298 Z" />
                        <polygon points="146,224 169,201 169,319.5 146,319.5" />
                        <path fill-rule="evenodd" d="M 229.5,275 A 44.5,44.5 0 1,0 229.5,364 A 44.5,44.5 0 1,0 229.5,275 Z M 229.5,298 A 21.5,21.5 0 1,1 229.5,341 A 21.5,21.5 0 1,1 229.5,298 Z" />
                        <rect x="208" y="308" width="43" height="23" />
                        <path fill-rule="evenodd" d="M 333.5,275 A 44.5,44.5 0 1,0 333.5,364 A 44.5,44.5 0 1,0 333.5,275 Z M 333.5,298 A 21.5,21.5 0 1,1 333.5,341 A 21.5,21.5 0 1,1 333.5,298 Z" />
                        <polygon points="289,319.5 312,319.5 312,414 289,437" />
                        <path fill-rule="evenodd" d="M 431.25,275 A 38.25,44.5 0 1,0 431.25,364 A 38.25,44.5 0 1,0 431.25,275 Z M 431.25,298 A 15.25,21.5 0 1,1 431.25,341 A 15.25,21.5 0 1,1 431.25,298 Z" />
                        <path fill-rule="evenodd" d="M 484.75,275 A 38.25,44.5 0 1,0 484.75,364 A 38.25,44.5 0 1,0 484.75,275 Z M 484.75,298 A 15.25,21.5 0 1,1 484.75,341 A 15.25,21.5 0 1,1 484.75,298 Z" />
                        <rect x="393" y="319.5" width="23" height="44.5" />
                        <rect x="446.5" y="319.5" width="23" height="44.5" />
                        <rect x="500" y="319.5" width="23" height="44.5" />
                        <rect x="537" y="285" width="23" height="79" />
                        <circle cx="548.5" cy="253.5" r="13.5" />
                    </svg>
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
            headers: {
                'Cache-Control': 'public, s-maxage=31536000, immutable',
            },
        },
    );
}
