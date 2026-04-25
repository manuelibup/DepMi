/**
 * Twitter API v2 helpers for the DepMi Bot (@depmibot).
 *
 * Uses OAuth 1.0a for posting replies (requires user-context auth for the bot account).
 * Uses Bearer token for reading mentions (app-only auth).
 *
 * Signing OAuth 1.0a manually since we don't want a heavy library dependency.
 */

import crypto from 'crypto';

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN!;
const API_KEY = process.env.TWITTER_API_KEY!;
const API_SECRET = process.env.TWITTER_API_SECRET!;
const ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN!;
const ACCESS_TOKEN_SECRET = process.env.TWITTER_ACCESS_TOKEN_SECRET!;
const BOT_USER_ID = process.env.TWITTER_BOT_USER_ID!;

const BASE = 'https://api.twitter.com/2';

// ─── OAuth 1.0a signing ──────────────────────────────────────────────────────

function percentEncode(str: string): string {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildOAuthHeader(method: string, url: string, params: Record<string, string> = {}): string {
    const oauthParams: Record<string, string> = {
        oauth_consumer_key: API_KEY,
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: String(Math.floor(Date.now() / 1000)),
        oauth_token: ACCESS_TOKEN,
        oauth_version: '1.0',
    };

    const allParams = { ...params, ...oauthParams };
    const sortedKeys = Object.keys(allParams).sort();
    const paramString = sortedKeys
        .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
        .join('&');

    const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(paramString)].join('&');
    const signingKey = `${percentEncode(API_SECRET)}&${percentEncode(ACCESS_TOKEN_SECRET)}`;
    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    oauthParams.oauth_signature = signature;

    const headerParts = Object.keys(oauthParams)
        .sort()
        .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
        .join(', ');

    return `OAuth ${headerParts}`;
}

// ─── Mentions ────────────────────────────────────────────────────────────────

export interface TwitterMention {
    id: string;
    text: string;
    authorId: string;
    attachmentUrls: string[];
}

/**
 * Fetch recent mentions of @depmibot.
 * Returns mentions newer than sinceId (if provided).
 */
export async function getRecentMentions(sinceId?: string): Promise<{ mentions: TwitterMention[]; newestId?: string }> {
    const params = new URLSearchParams({
        'tweet.fields': 'author_id,attachments,text',
        'expansions': 'attachments.media_keys',
        'media.fields': 'url,preview_image_url,type',
        max_results: '10',
    });

    if (sinceId) params.set('since_id', sinceId);

    const url = `${BASE}/users/${BOT_USER_ID}/mentions?${params.toString()}`;
    const res = await fetch(url, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    });

    if (!res.ok) {
        console.error('[twitter-api] Mentions fetch failed:', res.status, await res.text());
        return { mentions: [] };
    }

    const data = await res.json();
    if (!data.data || data.data.length === 0) return { mentions: [] };

    // Build a media URL map from expansions
    const mediaMap: Record<string, string> = {};
    for (const media of (data.includes?.media ?? [])) {
        if (media.media_key && (media.url || media.preview_image_url)) {
            mediaMap[media.media_key] = media.url || media.preview_image_url;
        }
    }

    const mentions: TwitterMention[] = data.data.map((tweet: {
        id: string;
        text: string;
        author_id: string;
        attachments?: { media_keys?: string[] };
    }) => ({
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        attachmentUrls: (tweet.attachments?.media_keys ?? []).map((k: string) => mediaMap[k]).filter(Boolean),
    }));

    return {
        mentions,
        newestId: data.meta?.newest_id,
    };
}

// ─── Reply ───────────────────────────────────────────────────────────────────

/** Reply to a tweet as @depmibot */
export async function replyToTweet(inReplyToTweetId: string, text: string): Promise<void> {
    const url = `${BASE}/tweets`;
    const body = JSON.stringify({ text, reply: { in_reply_to_tweet_id: inReplyToTweetId } });
    const authHeader = buildOAuthHeader('POST', url);

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
        },
        body,
    });

    if (!res.ok) {
        const text = await res.text();
        console.error('[twitter-api] Reply failed:', res.status, text);
    }
}

// ─── User lookup ─────────────────────────────────────────────────────────────

/** Get a Twitter user's username from their user ID */
export async function getUsernameById(userId: string): Promise<string | null> {
    const res = await fetch(`${BASE}/users/${userId}?user.fields=username`, {
        headers: { Authorization: `Bearer ${BEARER_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.username ?? null;
}
