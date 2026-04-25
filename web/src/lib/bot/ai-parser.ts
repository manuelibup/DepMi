import Anthropic from '@anthropic-ai/sdk';
import { Category } from '@prisma/client';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ParsedBotProduct {
    title: string;
    price: number;
    description: string;
    category: Category;
    confidence: 'high' | 'medium' | 'low';
}

const VALID_CATEGORIES = Object.values(Category);

const SYSTEM_PROMPT = `You are parsing a product post from a Nigerian vendor on WhatsApp, Instagram, or X (Twitter).
Extract ONE product from the image and/or caption text.

Return ONLY valid JSON with NO markdown formatting:
{
  "title": string (product name, max 100 chars, capitalize first letter),
  "price": number (Nigerian Naira — strip ₦, commas, spaces; just the number. Use 0 if unclear),
  "description": string (from caption, cleaned up, max 500 chars; empty string if none),
  "category": string (MUST be EXACTLY one of: FASHION, GADGETS, BEAUTY, COSMETICS, FOOD, FURNITURE, VEHICLES, SERVICES, TRANSPORT, SPORT, HOUSING, BOOKS, COURSE, OTHER),
  "confidence": string (MUST be "high", "medium", or "low" — how confident you are in the price extraction)
}

Tips for Nigerian vendor posts:
- "10k" = 10000, "5k" = 5000, "100k" = 100000
- Prices may be in pidgin: "e dey for 5k", "price na 3500"
- Ignore shipping/delivery mentions in the price extraction
- If multiple prices shown (e.g. sizes), use the lowest/base price
- Set confidence to "low" if price is ambiguous or missing`;

export async function parseProductFromPost(
    imageUrl: string | null,
    caption: string
): Promise<ParsedBotProduct> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentBlock: any[] = [];

    if (imageUrl) {
        contentBlock.push({
            type: 'image',
            source: {
                type: 'url',
                url: imageUrl,
            },
        });
    }

    if (caption) {
        contentBlock.push({
            type: 'text',
            text: `Caption: ${caption}`,
        });
    }

    contentBlock.push({
        type: 'text',
        text: 'Extract the product from this vendor post.',
    });

    const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contentBlock }],
        temperature: 0.1,
    });

    const firstBlock = msg.content?.[0];
    const rawText = (firstBlock && 'text' in firstBlock) ? firstBlock.text : '';

    let parsed: Partial<ParsedBotProduct> = {};
    try {
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
    } catch {
        console.error('[bot/ai-parser] Failed to parse AI output:', rawText);
    }

    return {
        title: (parsed.title || 'Product').substring(0, 100),
        price: typeof parsed.price === 'number' && parsed.price >= 0 ? parsed.price : 0,
        description: (parsed.description || '').substring(0, 500),
        category: VALID_CATEGORIES.includes(parsed.category as Category)
            ? (parsed.category as Category)
            : 'OTHER',
        confidence: ['high', 'medium', 'low'].includes(parsed.confidence as string)
            ? (parsed.confidence as 'high' | 'medium' | 'low')
            : 'low',
    };
}
