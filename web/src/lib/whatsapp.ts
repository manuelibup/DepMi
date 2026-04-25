/**
 * Meta WhatsApp Cloud API helper for DepMi seller notifications.
 *
 * All functions are fire-and-forget — errors are logged but never propagate.
 * Gracefully disabled when env vars are not configured (returns immediately).
 *
 * Required env vars (add to Vercel + .env.local once Meta Business is set up):
 *   WHATSAPP_ACCESS_TOKEN      — permanent system user token from Meta Business
 *   WHATSAPP_PHONE_NUMBER_ID   — phone number ID from WhatsApp Business dashboard
 *
 * Templates to register in Meta Business Manager (Messaging > Templates):
 *   depmi_new_order    — "You have a new order on DepMi! Order #{{1}} for \"{{2}}\" ₦{{3}}. Check it at depmi.com/orders"
 *   depmi_new_message  — "{{1}} sent you a message on DepMi. Reply at depmi.com/messages"
 *   depmi_new_comment  — "{{1}} asked a question about your product \"{{2}}\" on DepMi. depmi.com/orders"
 *
 * All three are utility templates (transactional) — fastest approval path.
 */

const GRAPH_API_VERSION = 'v20.0';

/** Convert a Nigerian phone to E.164 format (no +), e.g. 08012345678 → 2348012345678 */
function normalizePhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '').replace(/^00/, '');
    if (/^0[789]\d{9}$/.test(digits)) return '234' + digits.slice(1); // 0XX → 234XX
    if (/^234[789]\d{9}$/.test(digits)) return digits;                 // already 234XX
    if (digits.length >= 10 && digits.length <= 15) return digits;    // other valid intl
    return null;
}

async function callWhatsApp(to: string, templateName: string, params: string[]): Promise<void> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) return;

    const normalized = normalizePhone(to);
    if (!normalized) return;

    const payload = {
        messaging_product: 'whatsapp',
        to: normalized,
        type: 'template',
        template: {
            name: templateName,
            language: { code: 'en' },
            ...(params.length > 0 && {
                components: [{
                    type: 'body',
                    parameters: params.map(text => ({ type: 'text', text })),
                }],
            }),
        },
    };

    try {
        const res = await fetch(
            `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            }
        );
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.error('[whatsapp] send failed:', errBody);
        }
    } catch (err) {
        console.error('[whatsapp] fetch error:', err);
    }
}

/**
 * Notify a seller they have a new order.
 * Template: depmi_new_order
 * Body: "You have a new order on DepMi! Order #{{1}} for "{{2}}" ₦{{3}}. Check it at depmi.com/orders"
 */
export async function notifyWhatsAppNewOrder(
    sellerPhone: string,
    orderShortId: string,
    productTitle: string,
    amountNgn: number
): Promise<void> {
    await callWhatsApp(sellerPhone, 'depmi_new_order', [
        orderShortId,
        productTitle.slice(0, 60),
        Number(amountNgn).toLocaleString('en-NG'),
    ]);
}

/**
 * Notify a user they have a new DM.
 * Template: depmi_new_message
 * Body: "{{1}} sent you a message on DepMi. Reply at depmi.com/messages"
 */
export async function notifyWhatsAppNewMessage(
    recipientPhone: string,
    senderName: string
): Promise<void> {
    await callWhatsApp(recipientPhone, 'depmi_new_message', [
        senderName.slice(0, 60),
    ]);
}

/**
 * Notify a seller that someone commented/asked a question on their product.
 * Template: depmi_new_comment
 * Body: "{{1}} asked a question about your product "{{2}}" on DepMi. depmi.com/orders"
 */
export async function notifyWhatsAppNewComment(
    sellerPhone: string,
    commenterName: string,
    productTitle: string
): Promise<void> {
    await callWhatsApp(sellerPhone, 'depmi_new_comment', [
        commenterName.slice(0, 60),
        productTitle.slice(0, 60),
    ]);
}
