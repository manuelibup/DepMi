'use client';

import React, { useState, useRef, useEffect } from 'react';

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    onCancel: () => void;
}

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
    const [recording, setRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Start recording immediately when component mounts
    useEffect(() => {
        startRecording();
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                console.log('MediaRecorder stopped, creating blob...');
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                console.log('Blob created:', blob.size, 'bytes. Calling onRecordingComplete...');
                onRecordingComplete(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setRecording(true);
            setDuration(0);
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Microphone access denied or not available.');
            onCancel();
        }
    };

    const stopAndSend = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop();
            setRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatDuration = (sec: number) => {
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)',
            padding: '8px 16px',
            borderRadius: '28px',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-lg)',
            gap: '12px',
            width: '100%',
            animation: 'slideUp 0.3s ease-out'
        }}>
            <button
                type="button"
                onClick={onCancel}
                style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    padding: '8px'
                }}
            >
                CANCEL
            </button>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '10px',
                    height: '10px',
                    background: '#ff3b30',
                    borderRadius: '50%',
                    animation: 'pulseRed 1s infinite'
                }} />
                <span style={{
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: 'var(--text-main)'
                }}>
                    {formatDuration(duration)}
                </span>

                {/* Waveform simulation dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flex: 1, justifyContent: 'center' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} style={{
                            width: '3px',
                            height: `${Math.random() * 15 + 5}px`,
                            background: 'var(--primary)',
                            borderRadius: '2px',
                            animation: `wave {i*0.1}s infinite alternate`
                        }} />
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={stopAndSend}
                style={{
                    background: 'var(--primary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px var(--primary-glow)',
                    transition: 'transform 0.2s ease'
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
            </button>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulseRed {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes wave {
                    from { height: 5px; }
                    to { height: 20px; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}} />
        </div>
    );
}
