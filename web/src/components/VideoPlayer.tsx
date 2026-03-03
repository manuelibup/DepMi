'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';

const SPEEDS = [0.5, 1, 1.25, 1.5, 1.75, 2, 3];

function formatTime(secs: number): string {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

interface VideoPlayerProps {
    src: string;
    poster?: string;
}

const btnBase: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    flexShrink: 0,
    color: '#fff',
};

export default function VideoPlayer({ src, poster }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [bufferedPct, setBufferedPct] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    // ── Auto-hide controls ──────────────────────────────────────────────────────
    const resetHideTimer = useCallback(() => {
        setShowControls(true);
        if (hideTimer.current) clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    }, []);

    useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);

    // Keep controls visible when paused
    useEffect(() => {
        if (!isPlaying) {
            if (hideTimer.current) clearTimeout(hideTimer.current);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowControls(true);
        }
    }, [isPlaying]);

    // ── Video event listeners ───────────────────────────────────────────────────
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onTimeUpdate = () => {
            setCurrentTime(v.currentTime);
            if (v.buffered.length > 0) {
                setBufferedPct((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
            }
        };
        const onDurationChange = () => setDuration(v.duration);
        const onWaiting = () => setIsBuffering(true);
        const onPlaying = () => setIsBuffering(false);
        const onVolumeChange = () => setIsMuted(v.muted);
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);

        v.addEventListener('play', onPlay);
        v.addEventListener('pause', onPause);
        v.addEventListener('timeupdate', onTimeUpdate);
        v.addEventListener('durationchange', onDurationChange);
        v.addEventListener('waiting', onWaiting);
        v.addEventListener('playing', onPlaying);
        v.addEventListener('volumechange', onVolumeChange);
        document.addEventListener('fullscreenchange', onFsChange);

        return () => {
            v.removeEventListener('play', onPlay);
            v.removeEventListener('pause', onPause);
            v.removeEventListener('timeupdate', onTimeUpdate);
            v.removeEventListener('durationchange', onDurationChange);
            v.removeEventListener('waiting', onWaiting);
            v.removeEventListener('playing', onPlaying);
            v.removeEventListener('volumechange', onVolumeChange);
            document.removeEventListener('fullscreenchange', onFsChange);
        };
    }, []);

    // ── Controls ────────────────────────────────────────────────────────────────
    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setHasStarted(true); } else { v.pause(); }
        resetHideTimer();
    };

    const skip = (seconds: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + seconds));
        resetHideTimer();
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = videoRef.current;
        if (!v) return;
        v.currentTime = Number(e.target.value);
        resetHideTimer();
    };

    const toggleMute = () => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = !v.muted;
        resetHideTimer();
    };

    const setSpeed = (rate: number) => {
        const v = videoRef.current;
        if (!v) return;
        v.playbackRate = rate;
        setPlaybackRate(rate);
        setShowSpeedMenu(false);
        resetHideTimer();
    };

    const toggleFullscreen = () => {
        const el = containerRef.current;
        if (!el) return;
        if (!document.fullscreenElement) { el.requestFullscreen(); } else { document.exitFullscreen(); }
        resetHideTimer();
    };

    const progressPct = duration ? (currentTime / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            onMouseMove={resetHideTimer}
            onTouchStart={resetHideTimer}
            style={{
                position: 'relative',
                width: '100%',
                backgroundColor: '#000',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                aspectRatio: '16/9',
                userSelect: 'none',
            }}
        >
            {/* Video element */}
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                onClick={togglePlay}
                style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', cursor: 'pointer' }}
                playsInline
            />

            {/* Buffering spinner */}
            {isBuffering && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ width: 44, height: 44, border: '3px solid rgba(255,255,255,0.2)', borderTop: '3px solid #fff', borderRadius: '50%', animation: 'vp-spin 0.8s linear infinite' }} />
                </div>
            )}

            {/* Initial big play button */}
            {!hasStarted && !isBuffering && (
                <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="#000">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Paused overlay (after first play) */}
            {hasStarted && !isPlaying && !isBuffering && (
                <div onClick={togglePlay} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff">
                            <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                    </div>
                </div>
            )}

            {/* Speed menu */}
            {showSpeedMenu && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute', bottom: 56, right: 44,
                        background: 'rgba(18,18,18,0.97)',
                        borderRadius: 8, padding: '4px 0',
                        minWidth: 76, border: '1px solid rgba(255,255,255,0.12)',
                        zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    }}
                >
                    {[...SPEEDS].reverse().map(s => (
                        <button
                            key={s}
                            onClick={() => setSpeed(s)}
                            style={{
                                display: 'block', width: '100%',
                                padding: '9px 14px',
                                background: s === playbackRate ? 'var(--primary)' : 'transparent',
                                color: s === playbackRate ? '#000' : '#fff',
                                border: 'none', cursor: 'pointer',
                                textAlign: 'left', fontSize: '0.875rem',
                                fontWeight: s === playbackRate ? 700 : 400,
                            }}
                        >
                            {s}×
                        </button>
                    ))}
                </div>
            )}

            {/* Controls overlay */}
            <div
                style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.88))',
                    padding: '28px 10px 8px',
                    opacity: showControls ? 1 : 0,
                    transition: 'opacity 0.25s',
                    pointerEvents: showControls ? 'auto' : 'none',
                }}
            >
                {/* Seek bar */}
                <div style={{ position: 'relative', height: 4, marginBottom: 8, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }}>
                    {/* Buffered */}
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${bufferedPct}%`, background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
                    {/* Played */}
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progressPct}%`, background: 'var(--primary)', borderRadius: 2 }} />
                    {/* Scrubber thumb */}
                    <div style={{ position: 'absolute', top: '50%', left: `${progressPct}%`, transform: 'translate(-50%, -50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 4px rgba(0,0,0,0.4)' }} />
                    {/* Invisible range input on top */}
                    <input
                        type="range" min={0} max={duration || 100} step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0 }}
                    />
                </div>

                {/* Button row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>

                    {/* Play / Pause */}
                    <button onClick={togglePlay} style={btnBase} title={isPlaying ? 'Pause' : 'Play'}>
                        {isPlaying
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        }
                    </button>

                    {/* Skip back 10s */}
                    <button onClick={() => skip(-10)} style={btnBase} title="Rewind 10s">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M11 17a6 6 0 1 1 0-10H14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="14 7 11 4 14 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <text x="11.5" y="16" textAnchor="middle" fontSize="5.5" fill="#fff" fontWeight="bold" fontFamily="sans-serif">10</text>
                        </svg>
                    </button>

                    {/* Skip forward 10s */}
                    <button onClick={() => skip(10)} style={btnBase} title="Forward 10s">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M13 17a6 6 0 1 0 0-10H10" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <polyline points="10 7 13 4 10 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <text x="12.5" y="16" textAnchor="middle" fontSize="5.5" fill="#fff" fontWeight="bold" fontFamily="sans-serif">10</text>
                        </svg>
                    </button>

                    {/* Time display */}
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.72rem', marginLeft: 4, flex: 1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>

                    {/* Mute / Unmute */}
                    <button onClick={toggleMute} style={btnBase} title={isMuted ? 'Unmute' : 'Mute'}>
                        {isMuted
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
                        }
                    </button>

                    {/* Speed selector */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(v => !v); resetHideTimer(); }}
                        style={{ ...btnBase, fontSize: '0.75rem', fontWeight: 700, minWidth: 36 }}
                        title="Playback speed"
                    >
                        {playbackRate}×
                    </button>

                    {/* Fullscreen */}
                    <button onClick={toggleFullscreen} style={btnBase} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                        {isFullscreen
                            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                        }
                    </button>

                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `@keyframes vp-spin { 100% { transform: rotate(360deg); } }` }} />
        </div>
    );
}
