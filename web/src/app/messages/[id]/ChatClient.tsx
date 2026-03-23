'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import VoiceRecorder from '@/components/VoiceRecorder';
import styles from './page.module.css';

// Local interface since prisma client may not have generated types yet due to DLL lock
interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    text: string | null;
    type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'STICKER';
    mediaUrl: string | null;
    read: boolean;
    createdAt: string | Date;
}

interface UserParticipant {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
}

interface ChatClientProps {
    conversationId: string;
    initialMessages: any[];
    otherUser: UserParticipant;
    currentUser: UserParticipant;
    initialText?: string;
}

function ProductPreview({ id }: { id: string }) {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/products/${id}/preview`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) setProduct(data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className={styles.productLinkSkeleton}>
                <div className={styles.skeletonThumbnail} />
                <div className={styles.skeletonText} />
            </div>
        );
    }

    if (!product) {
        return (
            <Link href={`/p/${id}`} className={styles.productLink}>
                <span className={styles.productLinkIcon}>🛍️</span>
                <div className={styles.productLinkText}>
                    <p className={styles.productLinkLabel}>View Product</p>
                    <p className={styles.productIdHint}>Ref: {id.slice(0, 8)}...</p>
                </div>
            </Link>
        );
    }

    return (
        <Link href={`/p/${id}`} className={styles.productCard}>
            {product.thumbnail && (
                <div className={styles.productThumb}>
                    <img src={product.thumbnail} alt="" />
                </div>
            )}
            <div className={styles.cardContent}>
                <p className={styles.cardTitle}>{product.title}</p>
                <p className={styles.cardPrice}>₦{Number(product.price).toLocaleString()}</p>
            </div>
        </Link>
    );
}

function OrderPreview({ id }: { id: string }) {
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/orders/${id}/preview`)
            .then(res => res.json())
            .then(data => {
                if (!data.error) setOrder(data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) {
        return (
            <div className={styles.productLinkSkeleton}>
                <div className={styles.skeletonThumbnail} />
                <div className={styles.skeletonText} />
            </div>
        );
    }

    if (!order) {
        return (
            <div className={styles.productLink}>
                <span className={styles.productLinkIcon}>📦</span>
                <div className={styles.productLinkText}>
                    <p className={styles.productLinkLabel}>Order Reference</p>
                    <p className={styles.productIdHint}>Ref: {id.slice(0, 8)}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productCard}>
            {order.thumbnail && (
                <div className={styles.productThumb}>
                    <img src={order.thumbnail} alt="" />
                </div>
            )}
            <div className={styles.cardContent}>
                <p className={styles.cardTitle}>{order.productTitle}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <p className={styles.cardPrice}>₦{Number(order.totalAmount).toLocaleString()}</p>
                    <span className={styles.statusBadge} style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: 'var(--primary)' }}>
                        {order.status}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function ChatClient({ conversationId, initialMessages, otherUser, currentUser, initialText = '' }: ChatClientProps) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages as ChatMessage[]);
    const [text, setText] = useState(initialText);

    // If initialText is provided via URL (e.g. [order:id]), we might want to pre-fill it
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const queryText = params.get('text');
        if (queryText && !initialText) {
            setText(queryText);
        }
    }, [initialText]);

    const [sending, setSending] = useState(false);
    const [showAttachments, setShowAttachments] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const [audioProgress, setAudioProgress] = useState<{ [id: string]: number }>({});
    const [audioDurations, setAudioDurations] = useState<{ [id: string]: number }>({});
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // SSE with visibility detection
    useEffect(() => {
        let eventSource: EventSource | null = null;

        const connect = () => {
            if (eventSource) return;
            eventSource = new EventSource(`/api/messages/stream?conversationId=${conversationId}`);
            eventSource.onmessage = (event) => {
                try {
                    const newMsgs = JSON.parse(event.data);
                    if (Array.isArray(newMsgs) && newMsgs.length > 0) {
                        setMessages((prev) => {
                            const existingIds = new Set(prev.map((m) => m.id));
                            const uniqueNew = newMsgs.filter((m) => m.id && !existingIds.has(m.id));
                            if (uniqueNew.length === 0) return prev;
                            return [...prev, ...uniqueNew];
                        });
                    }
                } catch (err) { }
            };
        };

        const disconnect = () => {
            if (eventSource) {
                eventSource.close();
                eventSource = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                connect();
            } else {
                disconnect();
            }
        };

        // Connect initially if visible
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            connect();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            disconnect();
        };
    }, [conversationId]);

    const handleSend = async (payload: { text?: string, type?: string, mediaUrl?: string }) => {
        if (sending) return;
        setSending(true);

        try {
            const res = await fetch(`/api/messages/${conversationId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const sentMsg = await res.json();
                console.log('Message sent successfully:', sentMsg.id);
                setMessages((prev) => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
                if (payload.text) setText('');
                setShowAttachments(false);
            } else {
                const errData = await res.json();
                console.error('Failed to send message:', errData);
                alert(`Error: ${errData.message || 'Failed to send message'}`);
            }
        } catch (err: any) {
            console.error('Send error:', err);
            alert(`Network error: ${err.message || 'Could not reach server'}`);
        } finally {
            setSending(false);
        }
    };

    const handleUploadSuccess = (result: CloudinaryUploadResult) => {
        handleSend({ type: 'IMAGE', mediaUrl: result.secure_url });
    };

    const handleVoiceRecordingComplete = async (blob: Blob) => {
        console.log('Voice recording complete, size:', blob.size);
        setSending(true);
        setIsRecording(false);
        try {
            console.log('Requesting upload signature...');
            const resSig = await fetch('/api/upload/sign?resourceType=auto');
            if (!resSig.ok) throw new Error('Failed to get upload signature');

            const { timestamp, folder, upload_preset, signature, apiKey, cloudName } = await resSig.json();
            console.log('Signature received, starting Cloudinary upload...');

            const formData = new FormData();
            const extension = blob.type.split('/')[1] || 'webm';
            formData.append('file', blob, `voice-note.${extension}`);
            formData.append('api_key', apiKey);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);
            formData.append('folder', folder);
            formData.append('upload_preset', upload_preset);
            formData.append('resource_type', 'auto');

            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
            const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });

            if (uploadRes.ok) {
                const cloudData = await uploadRes.json();
                console.log('Cloudinary upload success:', cloudData.secure_url);

                if (cloudData.secure_url) {
                    await handleSend({ type: 'AUDIO', mediaUrl: cloudData.secure_url });
                } else {
                    throw new Error('Cloudinary response missing secure_url');
                }
            } else {
                const errData = await uploadRes.json();
                console.error('Cloudinary upload error:', errData);
                throw new Error(errData.error?.message || 'Cloudinary upload failed');
            }
        } catch (err: any) {
            console.error('Audio upload failed:', err);
            alert(`Voice note failed to send: ${err.message || 'Unknown error'}`);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            if (text.trim()) handleSend({ text: text.trim(), type: 'TEXT' });
        }
    };

    const togglePlayAudio = (msgId: string, url: string) => {
        if (playingAudioId === msgId) {
            audioRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.play();
                setPlayingAudioId(msgId);

                audioRef.current.ontimeupdate = () => {
                    const progress = (audioRef.current!.currentTime / audioRef.current!.duration) * 100;
                    setAudioProgress(prev => ({ ...prev, [msgId]: progress }));
                };

                audioRef.current.onloadedmetadata = () => {
                    setAudioDurations(prev => ({ ...prev, [msgId]: audioRef.current!.duration }));
                };

                audioRef.current.onended = () => {
                    setPlayingAudioId(null);
                    setAudioProgress(prev => ({ ...prev, [msgId]: 0 }));
                };
            }
        }
    };

    const formatDuration = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const renderMessageText = (content: string | null) => {
        if (!content) return null;

        // Regex to find [product:uuid] or [order:uuid]
        const parts = content.split(/(\[(?:product|order):[0-9a-f-]{36}\])/gi);

        return parts.map((part, i) => {
            const productMatch = part.match(/\[product:([0-9a-f-]{36})\]/i);
            if (productMatch) {
                return <ProductPreview key={i} id={productMatch[1]} />;
            }
            const orderMatch = part.match(/\[order:([0-9a-f-]{36})\]/i);
            if (orderMatch) {
                return <OrderPreview key={i} id={orderMatch[1]} />;
            }
            return part;
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <BackButton className={styles.backBtn} />
                <Link href={`/${otherUser.username}`} className={styles.headerInfo}>
                    {otherUser.avatarUrl ? (
                        <div className={styles.headerAvatar}>
                            <img src={otherUser.avatarUrl} alt={otherUser.displayName} />
                        </div>
                    ) : (
                        <div className={styles.headerAvatarPlaceholder}>
                            {otherUser.displayName.charAt(0)}
                        </div>
                    )}
                    <div className={styles.nameBlock}>
                        <h2 className={styles.userName}>{otherUser.displayName}</h2>
                    </div>
                </Link>
            </header>

            <div className={styles.chatArea}>
                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    return (
                        <div key={msg.id || idx} className={`${styles.messageRow} ${isMe ? styles.me : styles.other}`}>
                            <div className={styles.bubble}>
                                {msg.type === 'IMAGE' && msg.mediaUrl && (
                                    <div className={styles.mediaContainer}>
                                        <img src={msg.mediaUrl} alt="uploaded" className={styles.chatImage} />
                                    </div>
                                )}

                                {msg.type === 'AUDIO' && msg.mediaUrl && (
                                    <div className={styles.voiceMessageLayout}>
                                        {!isMe && (
                                            <div className={styles.voiceAvatar}>
                                                {otherUser.avatarUrl ? (
                                                    <img src={otherUser.avatarUrl} alt="" />
                                                ) : (
                                                    <div className={styles.avatarPlaceholder}>{otherUser.displayName[0]}</div>
                                                )}
                                                <div className={styles.micBadge}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                                                </div>
                                            </div>
                                        )}
                                        <div className={styles.voiceControls}>
                                            <button
                                                className={styles.playBtn}
                                                onClick={() => togglePlayAudio(msg.id, msg.mediaUrl!)}
                                            >
                                                {playingAudioId === msg.id ? (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                                                ) : (
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                                )}
                                            </button>
                                            <div className={styles.waveformContainer}>
                                                <div className={styles.waveform}>
                                                    {[...Array(20)].map((_, i) => {
                                                        const threshold = (i / 19) * 100;
                                                        const isActive = (audioProgress[msg.id] || 0) >= threshold;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`${styles.waveBar} ${isActive ? styles.activeWaveBar : ''}`}
                                                                style={{ height: `${20 + (Math.sin(i * 1.5) * 15 + 15)}%` }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                                <div className={styles.voiceMeta}>
                                                    <span className={styles.duration}>
                                                        {playingAudioId === msg.id
                                                            ? formatDuration(audioRef.current?.currentTime || 0)
                                                            : formatDuration(audioDurations[msg.id] || 0)
                                                        }
                                                    </span>
                                                    {!msg.read && !isMe && <span className={styles.unreadDot} />}
                                                </div>
                                            </div>
                                        </div>
                                        {isMe && (
                                            <div className={styles.voiceAvatar}>
                                                {currentUser.avatarUrl ? (
                                                    <img src={currentUser.avatarUrl} alt="" />
                                                ) : (
                                                    <div className={styles.avatarPlaceholder}>{currentUser.displayName[0]}</div>
                                                )}
                                                <div className={styles.micBadge}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {msg.type === 'STICKER' && msg.mediaUrl && (
                                    <div className={styles.stickerContainer}>
                                        <img src={msg.mediaUrl} alt="sticker" className={styles.stickerImage} />
                                    </div>
                                )}
                                {msg.text && <div className={styles.msgText}>{renderMessageText(msg.text)}</div>}
                                <div className={styles.time}>{timeStr}</div>
                            </div>
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>

            <audio ref={audioRef} style={{ display: 'none' }} />

            <div className={styles.inputArea}>
                {isRecording ? (
                    <VoiceRecorder onRecordingComplete={handleVoiceRecordingComplete} onCancel={() => setIsRecording(false)} />
                ) : (
                    <>
                        {showAttachments && (
                            <div className={styles.attachmentMenu}>
                                <CloudinaryUploader
                                    onUploadSuccess={handleUploadSuccess}
                                    buttonText="Send Photo"
                                    accept="image/*"
                                    maxSizeMB={10}
                                />
                                <div className={styles.stickerSelection}>
                                    {['https://res.cloudinary.com/demo/image/upload/v1/sample.jpg', '🚀', '🔥', '💎'].map(s => (
                                        <button key={s} className={styles.stickerItem} onClick={() => handleSend({ type: 'STICKER', mediaUrl: s })}>
                                            {s.startsWith('http') ? <img src={s} alt="" /> : s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <form className={styles.inputForm} onSubmit={(e) => { e.preventDefault(); if (text.trim()) handleSend({ text: text.trim(), type: 'TEXT' }); }}>
                            <button type="button" className={styles.attachTrigger} onClick={() => setShowAttachments(!showAttachments)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                            </button>
                            <div className={styles.inputWrap}>
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Message... (Ctrl+Enter to send)"
                                    className={styles.textarea}
                                    rows={1}
                                />
                            </div>
                            {text.trim() ? (
                                <button type="submit" className={styles.sendBtn} disabled={sending}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                </button>
                            ) : (
                                <button type="button" className={styles.micBtn} onClick={() => setIsRecording(true)}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                </button>
                            )}
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
