'use client';

import { useEffect } from 'react';

const UTM_KEY = '_dm_utm';
const UTM_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

// Map referrer hostname → { source, medium }
const REFERRER_MAP: Record<string, { source: string; medium: string }> = {
    'instagram.com':      { source: 'instagram',  medium: 'social' },
    'l.instagram.com':    { source: 'instagram',  medium: 'social' },
    'twitter.com':        { source: 'twitter',     medium: 'social' },
    'x.com':              { source: 'twitter',     medium: 'social' },
    't.co':               { source: 'twitter',     medium: 'social' },
    'facebook.com':       { source: 'facebook',    medium: 'social' },
    'l.facebook.com':     { source: 'facebook',    medium: 'social' },
    'm.facebook.com':     { source: 'facebook',    medium: 'social' },
    'tiktok.com':         { source: 'tiktok',      medium: 'social' },
    'youtube.com':        { source: 'youtube',     medium: 'social' },
    'youtu.be':           { source: 'youtube',     medium: 'social' },
    't.me':               { source: 'telegram',    medium: 'social' },
    'telegram.org':       { source: 'telegram',    medium: 'social' },
    'linkedin.com':       { source: 'linkedin',    medium: 'social' },
    'lnkd.in':            { source: 'linkedin',    medium: 'social' },
    'google.com':         { source: 'google',      medium: 'organic' },
    'google.com.ng':      { source: 'google',      medium: 'organic' },
    'bing.com':           { source: 'bing',        medium: 'organic' },
    'yahoo.com':          { source: 'yahoo',       medium: 'organic' },
};

function inferFromReferrer(): Record<string, string> | null {
    try {
        const ref = document.referrer;
        if (!ref) return { utm_source: 'direct', utm_medium: 'none' };
        const host = new URL(ref).hostname.replace(/^www\./, '');
        const match = REFERRER_MAP[host];
        if (match) return { utm_source: match.source, utm_medium: match.medium };
        // Unknown external referrer — store the raw domain
        return { utm_source: host, utm_medium: 'referral' };
    } catch {
        return null;
    }
}

/**
 * On first load:
 * 1. If UTM params are in the URL — use those (manual always wins).
 * 2. Otherwise infer source from document.referrer automatically.
 * Persists to localStorage for 7 days. useTrackEvent attaches to every event.
 */
export default function UTMCapture() {
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const utm: Record<string, string> = {};
            UTM_PARAMS.forEach(key => {
                const val = params.get(key);
                if (val) utm[key] = val;
            });

            if (Object.keys(utm).length > 0) {
                // Manual UTM params present — store and exit (highest priority)
                localStorage.setItem(UTM_KEY, JSON.stringify({ ...utm, _ts: Date.now() }));
                return;
            }

            // No manual UTM — check if we already have a stored attribution
            const existing = localStorage.getItem(UTM_KEY);
            if (existing) {
                const parsed = JSON.parse(existing) as Record<string, unknown>;
                const age = Date.now() - (parsed._ts as number ?? 0);
                if (age < UTM_TTL) return; // Still within 7-day window, keep it
            }

            // No stored attribution (or expired) — infer from referrer
            const inferred = inferFromReferrer();
            if (inferred) {
                localStorage.setItem(UTM_KEY, JSON.stringify({ ...inferred, _ts: Date.now() }));
            }
        } catch { /* ignore */ }
    }, []);

    return null;
}
