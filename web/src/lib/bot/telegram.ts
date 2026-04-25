const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE = `https://api.telegram.org/bot${TOKEN}`;
const FILE_BASE = `https://api.telegram.org/file/bot${TOKEN}`;

/** Send a text message to a Telegram chat */
export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
    const res = await fetch(`${BASE}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'Markdown',
            // Disable link previews so the magic link doesn't expand into a big embed
            disable_web_page_preview: true,
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error('[telegram] sendMessage failed:', res.status, err);
    }
}

/**
 * Get the public download URL for a Telegram file.
 * Telegram stores files on their CDN — you first call getFile to get the path,
 * then construct the download URL.
 */
export async function getTelegramFileUrl(fileId: string): Promise<string> {
    const res = await fetch(`${BASE}/getFile?file_id=${fileId}`);
    if (!res.ok) throw new Error(`getFile failed for ${fileId}: ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(`getFile error: ${data.description}`);
    return `${FILE_BASE}/${data.result.file_path}`;
}

/**
 * Register the webhook URL with Telegram.
 * Call this once during setup: GET /api/webhooks/telegram/register
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<boolean> {
    const res = await fetch(`${BASE}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await res.json();
    return data.ok === true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TelegramUpdate {
    update_id: number;
    message?: TelegramMessage;
    channel_post?: TelegramMessage;
}

export interface TelegramMessage {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
    caption?: string;
    photo?: TelegramPhotoSize[];
    document?: { file_id: string; mime_type?: string };
}

export interface TelegramPhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
}
