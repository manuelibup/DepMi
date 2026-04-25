const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!;
const BASE = 'https://graph.facebook.com/v21.0';

export interface InstagramMediaDetails {
    imageUrl: string;
    caption: string;
    mediaType: string;
}

/** Fetch image URL and caption for an Instagram media object */
export async function fetchMediaDetails(mediaId: string): Promise<InstagramMediaDetails> {
    const res = await fetch(
        `${BASE}/${mediaId}?fields=media_url,thumbnail_url,caption,media_type&access_token=${ACCESS_TOKEN}`
    );
    if (!res.ok) throw new Error(`Instagram media fetch failed: ${res.status}`);

    const data = await res.json();
    return {
        imageUrl: data.media_url || data.thumbnail_url || '',
        caption: data.caption || '',
        mediaType: data.media_type || 'IMAGE',
    };
}

/** Reply to an Instagram comment */
export async function replyToComment(commentId: string, message: string): Promise<void> {
    const res = await fetch(`${BASE}/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: ACCESS_TOKEN }),
    });
    if (!res.ok) {
        const text = await res.text();
        console.error('[instagram-api] Reply failed:', res.status, text);
    }
}

/** Get the Instagram user ID for an @mention from a webhook mention event */
export function extractMentionedUserHandle(commentText: string): string | null {
    const match = commentText.match(/@depmibot/i);
    return match ? 'depmibot' : null;
}
