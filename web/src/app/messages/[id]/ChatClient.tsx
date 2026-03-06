'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { Message } from '@prisma/client';
import styles from './page.module.css';

interface UserParticipant {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
}

interface ChatClientProps {
    conversationId: string;
    initialMessages: Message[];
    otherUser: UserParticipant;
    currentUserId: string;
}

export default function ChatClient({ conversationId, initialMessages, otherUser, currentUserId }: ChatClientProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on load and new message
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Real-time updates via Server-Sent Events (SSE)
    useEffect(() => {
        const eventSource = new EventSource(`/api/messages/stream?conversationId=${conversationId}`);

        eventSource.onmessage = (event) => {
            try {
                const newMsgs = JSON.parse(event.data);
                if (Array.isArray(newMsgs) && newMsgs.length > 0) {
                    setMessages((prev) => {
                        // Filter out duplicates (e.g. from optimistic UI updates)
                        const existingIds = new Set(prev.map((m) => m.id));
                        const uniqueNew = newMsgs.filter((m) => m.id && !existingIds.has(m.id));
                        if (uniqueNew.length === 0) return prev;
                        return [...prev, ...uniqueNew];
                    });
                }
            } catch (err) {
                console.error('SSE data parse error', err);
            }
        };

        eventSource.onerror = () => {
            // EventSource auto-reconnects by default. 
            console.log('SSE connection lost or reconnecting...');
        };

        return () => {
            eventSource.close();
        };
    }, [conversationId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || sending) return;

        setSending(true);
        const currentText = text;
        setText(''); // optimistic clear

        try {
            const res = await fetch(`/api/messages/${conversationId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: currentText.trim() })
            });

            if (res.ok) {
                const sentMsg = await res.json();
                setMessages((prev) => {
                    if (prev.some(m => m.id === sentMsg.id)) return prev;
                    return [...prev, sentMsg];
                });
            } else {
                // Return text if failed
                setText(currentText);
            }
        } catch (err) {
            setText(currentText);
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e as unknown as React.FormEvent);
        }
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <BackButton className={styles.backBtn} />
                
                <Link href={otherUser.username ? `/u/${otherUser.username}` : '#'} className={styles.userInfo}>
                    {otherUser.avatarUrl ? (
                        <img src={otherUser.avatarUrl} alt="" className={styles.avatar} />
                    ) : (
                        <div className={styles.avatar}>
                            {otherUser.displayName.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div className={styles.nameBlock}>
                        <h2 className={styles.userName}>{otherUser.displayName}</h2>
                        {otherUser.username && <span className={styles.userHandle}>@{otherUser.username}</span>}
                    </div>
                </Link>
            </header>

            {/* Chat Area */}
            <div className={styles.chatArea}>
                {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '20px' }}>
                        Start a conversation with {otherUser.displayName}
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.senderId === currentUserId;
                        // Simple time formatter for bubble
                        const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={msg.id || idx} className={`${styles.messageRow} ${isMe ? styles.me : styles.other}`}>
                                <div className={styles.bubble}>
                                    {msg.text}
                                    <div className={styles.time}>{timeStr}</div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
                <form className={styles.inputForm} onSubmit={handleSend}>
                    <div className={styles.inputWrap}>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message..."
                            className={styles.textarea}
                            rows={1}
                            maxLength={1000}
                        />
                    </div>
                    <button type="submit" className={styles.sendBtn} disabled={!text.trim() || sending}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
