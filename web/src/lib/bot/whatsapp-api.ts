const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const BASE_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

async function sendMessage(body: object): Promise<void> {
    const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        console.error('[whatsapp-api] Send failed:', res.status, text);
    }
}

/** Send a plain text message to a WhatsApp number (E.164 format, e.g. +2348012345678) */
export async function sendText(to: string, text: string): Promise<void> {
    await sendMessage({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
    });
}

/**
 * Send a message with up to 3 quick-reply buttons.
 * buttonLabels: array of strings (max 20 chars each, max 3 buttons)
 */
export async function sendButtons(
    to: string,
    bodyText: string,
    buttonLabels: string[]
): Promise<void> {
    const buttons = buttonLabels.slice(0, 3).map((label, i) => ({
        type: 'reply',
        reply: { id: `btn_${i}`, title: label.substring(0, 20) },
    }));

    await sendMessage({
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
            type: 'button',
            body: { text: bodyText },
            action: { buttons },
        },
    });
}

/** Download a WhatsApp media file URL (requires a separate media API call to get the URL first) */
export async function getMediaUrl(mediaId: string): Promise<string> {
    const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Failed to get media URL for ${mediaId}`);
    const data = await res.json();
    return data.url as string;
}

/**
 * Download the actual media bytes from a WhatsApp media URL.
 * WhatsApp CDN URLs require the Authorization header.
 * Returns the binary response as an ArrayBuffer.
 */
export async function downloadMedia(mediaUrl: string): Promise<ArrayBuffer> {
    const res = await fetch(mediaUrl, {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
    if (!res.ok) throw new Error(`Failed to download WhatsApp media from ${mediaUrl}`);
    return res.arrayBuffer();
}
