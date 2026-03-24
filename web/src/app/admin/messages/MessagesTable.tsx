'use client';

import React, { useState } from 'react';
import styles from './MessagesTable.module.css';

interface Message {
    id: string;
    text: string | null;
    type: string;
    mediaUrl: string | null;
    createdAt: string;
    read: boolean;
    sender: { id: string; username: string | null; displayName: string };
}

interface Conversation {
    id: string;
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
    participants: { id: string; username: string | null; displayName: string; avatarUrl: string | null }[];
    _count: { messages: number };
    messages: Message[];
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function MessagesTable({ conversations }: { conversations: Conversation[] }) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const [deleted, setDeleted] = useState<Set<string>>(new Set());
    const [deleting, setDeleting] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filtered = conversations.filter(c => {
        if (!search) return true;
        const q = search.toLowerCase();
        return c.participants.some(p =>
            p.username?.toLowerCase().includes(q) ||
            p.displayName.toLowerCase().includes(q)
        );
    });

    const handleDelete = async (msgId: string) => {
        if (!confirm('Delete this message? This cannot be undone.')) return;
        setDeleting(msgId);
        try {
            const res = await fetch(`/api/admin/messages/${msgId}`, { method: 'DELETE' });
            if (res.ok) setDeleted(prev => new Set([...prev, msgId]));
            else alert('Failed to delete message');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className={styles.wrap}>
            <input
                className={styles.search}
                placeholder="Search by username or name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />

            <div className={styles.list}>
                {filtered.map(conv => {
                    const isOpen = expanded === conv.id;
                    const names = conv.participants.map(p => p.username ? `@${p.username}` : p.displayName).join(' ↔ ');
                    const visibleMessages = conv.messages.filter(m => !deleted.has(m.id));

                    return (
                        <div key={conv.id} className={styles.row}>
                            <button
                                className={styles.convHeader}
                                onClick={() => setExpanded(isOpen ? null : conv.id)}
                            >
                                <div className={styles.convMeta}>
                                    <span className={styles.convParticipants}>{names}</span>
                                    <span className={styles.convPreview}>{conv.lastMessagePreview ?? '—'}</span>
                                </div>
                                <div className={styles.convRight}>
                                    <span className={styles.msgCount}>{conv._count.messages} msgs</span>
                                    {conv.lastMessageAt && (
                                        <span className={styles.convTime}>{timeAgo(conv.lastMessageAt)}</span>
                                    )}
                                    <svg
                                        width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                        style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '200ms' }}
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </div>
                            </button>

                            {isOpen && (
                                <div className={styles.messages}>
                                    {visibleMessages.length === 0 && (
                                        <p className={styles.empty}>No messages to show.</p>
                                    )}
                                    {visibleMessages.map(msg => (
                                        <div key={msg.id} className={styles.message}>
                                            <div className={styles.msgMeta}>
                                                <span className={styles.msgSender}>
                                                    {msg.sender.username ? `@${msg.sender.username}` : msg.sender.displayName}
                                                </span>
                                                <span className={styles.msgTime}>{timeAgo(msg.createdAt)}</span>
                                                {msg.type !== 'TEXT' && (
                                                    <span className={styles.msgTypeBadge}>{msg.type}</span>
                                                )}
                                            </div>
                                            <div className={styles.msgBody}>
                                                {msg.text && <p className={styles.msgText}>{msg.text}</p>}
                                                {msg.mediaUrl && (
                                                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className={styles.mediaLink}>
                                                        View media →
                                                    </a>
                                                )}
                                            </div>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => handleDelete(msg.id)}
                                                disabled={deleting === msg.id}
                                                title="Delete this message"
                                            >
                                                {deleting === msg.id ? '…' : (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6l-1 14H6L5 6" />
                                                        <path d="M10 11v6M14 11v6" />
                                                        <path d="M9 6V4h6v2" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <p className={styles.empty}>No conversations found.</p>
                )}
            </div>
        </div>
    );
}
