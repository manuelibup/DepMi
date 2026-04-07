import { prisma } from './prisma';

const STRIKE_LIMIT = 5;

const PATTERNS: { regex: RegExp; reason: string }[] = [
    // Nigerian phone numbers (070, 080, 081, 090, 091 + 8 digits)
    { regex: /\b0[7-9][0-1]\d{8}\b/, reason: 'phone number' },
    // International numbers (+234, +1, etc.)
    { regex: /\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}/, reason: 'phone number' },
    // Email addresses
    { regex: /\b[a-zA-Z0-9._%+\-]+@(?!depmi\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/, reason: 'email address' },
    // WhatsApp — full name, short "wa", "wp"
    { regex: /\b(chat|talk|message|reach|contact|hit|hmu)\s+(me\s+)?(on|via|through|at)\s+(whatsapp|wa|wp)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bwa\.me\/\d+\b/i, reason: 'WhatsApp link' },
    { regex: /\bmy\s+(whatsapp|wa|wp)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\b(whatsapp|wa|wp)\s+(num(ber)?|no\.?|#)\b/i, reason: 'off-platform contact solicitation' },
    // Telegram — full name and "tg"
    { regex: /\bt\.me\/\S+/i, reason: 'Telegram link' },
    { regex: /\b(chat|talk|message|reach|contact|hmu)\s+(me\s+)?(on|via|through|at)\s+(telegram|tg)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(telegram|tg)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\b(telegram|tg)\s+(user(name)?|id|handle|@)\b/i, reason: 'off-platform contact solicitation' },
    // Snapchat — full name and "sc"
    { regex: /\b(my\s+)?(snap(chat)?|sc)(\s+is|\s*:|\s+id)?\s*[@:]?\s*\S+/i, reason: 'Snapchat handle' },
    { regex: /\badd\s+me\s+on\s+(snap(chat)?|sc)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\b(snap(chat)?|sc)\s+(user(name)?|id|handle)\b/i, reason: 'off-platform contact solicitation' },
    // TikTok — full name and "tt"
    { regex: /\b(dm|follow|find|add|hmu)\s+(me\s+)?on\s+(tiktok|tt)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(tiktok|tt)\b/i, reason: 'off-platform contact solicitation' },
    // Instagram — full name, "ig", "insta"
    { regex: /\b(dm|message|follow|find|contact|hmu)\s+(me\s+)?on\s+(ig|insta(gram)?)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(ig|insta(gram)?)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\b(ig|insta(gram)?)\s+(user(name)?|id|handle|@)\b/i, reason: 'off-platform contact solicitation' },
    // Twitter/X
    { regex: /\b(dm|message|follow|find|contact|hmu)\s+(me\s+)?on\s+(twitter|x\.com)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(twitter|x)\s+(handle|@|dm)\b/i, reason: 'off-platform contact solicitation' },
    // Generic off-platform solicitation
    { regex: /\bdm\b/i, reason: 'off-platform contact solicitation' },
];

export function detectViolation(text: string): { blocked: true; reason: string; match: string } | { blocked: false } {
    for (const { regex, reason } of PATTERNS) {
        const match = text.match(regex);
        if (match) {
            return { blocked: true, reason, match: match[0] };
        }
    }
    return { blocked: false };
}

/**
 * Checks content for violations, records a strike, bans at STRIKE_LIMIT.
 * Returns an error message string if blocked, null if clean.
 */
export async function applyContentFilter(userId: string, text: string): Promise<string | null> {
    const check = detectViolation(text);
    if (!check.blocked) return null;

    // Record strike and increment count atomically
    const [, updated] = await prisma.$transaction([
        prisma.strike.create({
            data: {
                userId,
                reason: check.reason,
                context: check.match.slice(0, 100),
            },
        }),
        prisma.user.update({
            where: { id: userId },
            data: { strikeCount: { increment: 1 } },
            select: { strikeCount: true },
        }),
    ]);

    const newCount = updated.strikeCount;

    if (newCount >= STRIKE_LIMIT) {
        await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
        await prisma.notification.create({
            data: {
                userId,
                type: 'SYSTEM',
                title: 'Your account has been suspended',
                body: 'You have been suspended for repeatedly sharing contact information outside DepMi. Contact support to appeal.',
                link: '/help',
            },
        });
        return 'Your account has been suspended for repeated policy violations.';
    }

    const remaining = STRIKE_LIMIT - newCount;
    await prisma.notification.create({
        data: {
            userId,
            type: 'SYSTEM',
            title: `Warning: Strike ${newCount} of ${STRIKE_LIMIT}`,
            body: `Sharing ${check.reason} in messages is not allowed on DepMi. ${remaining} more violation${remaining === 1 ? '' : 's'} will result in a suspension.`,
            link: '/help',
        },
    });

    return `Sharing contact information (${check.reason}) is not allowed on DepMi. This is strike ${newCount} of ${STRIKE_LIMIT}.`;
}
