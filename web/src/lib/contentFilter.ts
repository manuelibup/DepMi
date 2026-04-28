import { prisma } from './prisma';

const STRIKE_LIMIT = 5;

// Patterns that always block (off-platform contact sharing)
const CONTACT_PATTERNS: { regex: RegExp; reason: string }[] = [
    // Nigerian phone numbers (070, 080, 081, 090, 091 + 8 digits)
    { regex: /\b0[7-9][0-1]\d{8}\b/, reason: 'phone number' },
    // International numbers (+234, +1, etc.)
    { regex: /\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{3,5}/, reason: 'phone number' },
    // Email addresses
    { regex: /\b[a-zA-Z0-9._%+\-]+@(?!depmi\.com)[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/, reason: 'email address' },
    // WhatsApp
    { regex: /\b(chat|talk|message|reach|contact|hit|hmu)\s+(me\s+)?(on|via|through|at)\s+(whatsapp|wa|wp)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bwa\.me\/\d+\b/i, reason: 'WhatsApp link' },
    { regex: /\bmy\s+(whatsapp|wa|wp)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\b(whatsapp|wa|wp)\s+(num(ber)?|no\.?|#)\b/i, reason: 'off-platform contact solicitation' },
    // Telegram
    { regex: /\bt\.me\/\S+/i, reason: 'Telegram link' },
    { regex: /\b(chat|talk|message|reach|contact|hmu)\s+(me\s+)?(on|via|through|at)\s+(telegram|tg)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(telegram|tg)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\b(telegram|tg)\s+(user(name)?|id|handle|@)\b/i, reason: 'off-platform contact solicitation' },
    // Snapchat — never match bare "sc", require full word "snapchat" or "snap"
    { regex: /\bmy\s+snap(chat)?\b/i, reason: 'Snapchat handle' },
    { regex: /\badd\s+me\s+on\s+snap(chat)?\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bsnap(chat)?\s+(user(name)?|id|handle|is|:)\b/i, reason: 'off-platform contact solicitation' },
    // TikTok
    { regex: /\b(dm|follow|find|add|hmu)\s+(me\s+)?on\s+(tiktok|tt)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(tiktok|tt)\b/i, reason: 'off-platform contact solicitation' },
    // Instagram
    { regex: /\b(dm|message|follow|find|contact|hmu)\s+(me\s+)?on\s+(ig|insta(gram)?)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(ig|insta(gram)?)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\b(ig|insta(gram)?)\s+(user(name)?|id|handle|@)\b/i, reason: 'off-platform contact solicitation' },
    // Twitter/X
    { regex: /\b(dm|message|follow|find|contact|hmu)\s+(me\s+)?on\s+(twitter|x\.com)\b/i, reason: 'off-platform contact solicitation' },
    { regex: /\bmy\s+(twitter|x)\s+(handle|@|dm)\b/i, reason: 'off-platform contact solicitation' },
];

// Regex to find any external URL (not depmi.com) in text
const EXTERNAL_URL_REGEX = /https?:\/\/(?!(?:www\.)?depmi\.com)[^\s]+|(?<![/@])www\.(?!depmi\.com)[a-z0-9\-]+\.[a-z]{2,}[^\s]*/gi;

function extractDomain(url: string): string {
    try {
        const u = new URL(url.startsWith('http') ? url : `https://${url}`);
        return u.hostname.replace(/^www\./, '');
    } catch {
        return url.replace(/^www\./, '').split('/')[0];
    }
}

export function detectContactViolation(text: string): { blocked: true; reason: string; match: string } | { blocked: false } {
    for (const { regex, reason } of CONTACT_PATTERNS) {
        const match = text.match(regex);
        if (match) return { blocked: true, reason, match: match[0] };
    }
    return { blocked: false };
}

/** Returns the first unapproved external URL found in text, or null if clean. */
async function findUnapprovedLink(text: string): Promise<string | null> {
    const matches = text.match(EXTERNAL_URL_REGEX);
    if (!matches) return null;

    for (const match of matches) {
        const domain = extractDomain(match);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const approved = await (prisma as any).approvedLink.findFirst({
                where: { domain, status: 'APPROVED' },
                select: { id: true },
            });
            if (!approved) return match;
        } catch {
            // Table not yet created — treat as unapproved
            return match;
        }
    }
    return null;
}

/**
 * Checks content for violations, records a strike, bans at STRIKE_LIMIT.
 * Returns an error message string if blocked, null if clean.
 * Pass isImmune=true for admin/super-admin users to skip enforcement.
 */
export async function applyContentFilter(userId: string, text: string, isImmune = false): Promise<string | null> {
    if (isImmune) return null;

    // Check off-platform contact solicitation
    const contactCheck = detectContactViolation(text);
    if (contactCheck.blocked) {
        return issueStrike(userId, contactCheck.reason, contactCheck.match);
    }

    // Check external links (with approved-list exemption)
    const badLink = await findUnapprovedLink(text);
    if (badLink) {
        return issueStrike(userId, 'external link', badLink.slice(0, 100));
    }

    return null;
}

async function issueStrike(userId: string, reason: string, matchContext: string): Promise<string> {
    const [, updated] = await prisma.$transaction([
        prisma.strike.create({
            data: { userId, reason, context: matchContext.slice(0, 100) },
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
                body: 'You have been suspended for repeatedly violating DepMi community guidelines. Contact support to appeal.',
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
            body: `Sharing ${reason} in posts or comments is not allowed on DepMi. ${remaining} more violation${remaining === 1 ? '' : 's'} will result in a suspension. See the Help Center for community guidelines.`,
            link: '/help',
        },
    });

    return `Sharing ${reason} is not allowed on DepMi. This is strike ${newCount} of ${STRIKE_LIMIT}.`;
}

/** Resolves whether a userId belongs to an admin/super-admin (bypasses content filter). */
export async function isAdminUser(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { adminRole: true } });
    return !!user?.adminRole;
}
