'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

export default function PushPrompt() {
    const { data: session } = useSession();
    const [show, setShow] = useState(false);
    const [subscribed, setSubscribed] = useState(false);

    useEffect(() => {
        if (!session?.user?.id) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (Notification.permission === 'granted') return; // already granted
        if (Notification.permission === 'denied') return;  // user blocked, don't pester
        if (localStorage.getItem('push-dismissed')) return;

        // Show prompt after a 3s delay so it doesn't hit immediately on load
        const t = setTimeout(() => setShow(true), 3000);
        return () => clearTimeout(t);
    }, [session?.user?.id]);

    async function subscribe() {
        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
            const json = sub.toJSON();
            await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
            });
            setSubscribed(true);
            setShow(false);
        } catch {
            setShow(false);
        }
    }

    function dismiss() {
        localStorage.setItem('push-dismissed', '1');
        setShow(false);
    }

    if (subscribed) return null;
    if (!show) return null;

    return (
        <div style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '14px 18px', zIndex: 9999,
            display: 'flex', alignItems: 'center', gap: 12, maxWidth: 340, width: 'calc(100vw - 32px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
            <span style={{ fontSize: 24 }}>🔔</span>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Stay in the loop</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#aaa', marginTop: 2 }}>Get notified for bids, messages &amp; orders</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={subscribe} style={{
                    background: '#00C853', color: '#000', border: 'none', borderRadius: 8,
                    padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}>Allow</button>
                <button onClick={dismiss} style={{
                    background: 'transparent', color: '#888', border: 'none',
                    fontSize: '0.7rem', cursor: 'pointer', padding: 0,
                }}>Not now</button>
            </div>
        </div>
    );
}
