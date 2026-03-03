import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { Category } from '@prisma/client';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '', 
  // Allow empty fallback so Next.js build doesn't crash if missing locally, 
  // but it will fail at runtime if actually invoked without a key.
});

export const maxDuration = 60; // Max allowed serverless extension for AI

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
             return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
             return NextResponse.json({ message: 'AI Parsing is not enabled. Missing API key.' }, { status: 503 });
        }

        const body = await req.json();
        const { base64Image, textContent, mediaType } = body;

        if (!base64Image && !textContent) {
            return NextResponse.json({ message: 'You must provide an image or text content to parse.' }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentBlock: any[] = [];
        
        if (base64Image) {
            // base64Image comes in as raw base64 from the frontend, mediaType e.g., 'image/jpeg'
            contentBlock.push({
                type: "image",
                source: {
                    type: "base64",
                    media_type: mediaType || "image/jpeg",
                    data: base64Image
                }
            });
        }

        if (textContent) {
             contentBlock.push({
                 type: "text",
                 text: textContent
             });
        }

        const systemPrompt = `You are a strict data extraction AI for the DepMi catalog pipeline. Your sole job is to extract product listings from unstructured data (handwritten menus, receipts, text catalogs) and output a RAW JSON array of objects.

Schema per object:
- title: string (derived from item name, max 100 chars, capitalize first letter)
- price: number (derived from price, strip out currency symbols and commas, just the pure float)
- description: string (empty string if none)
- category: MUST BE EXACTLY ONE OF: [FASHION, GADGETS, BEAUTY, FOOD, FURNITURE, VEHICLES, SERVICES, OTHER]. Classify logically.

CRITICAL INSTRUCTIONS:
1. Return ONLY the JSON array. Example: [{"title": "Leather Boots", "price": 45000, "description": "Vintage", "category": "FASHION"}]
2. Do not include markdown formatting like \`\`\`json. Output raw text.
3. If no recognizable products are found, return "[]".
4. If there's an obvious multi-line catalog, treat each unique item as a row.`;

        contentBlock.push({
            type: "text",
            text: "Extract the products from this source."
        });

        const msg = await anthropic.messages.create({
             model: 'claude-haiku-4-5-20251001',
             max_tokens: 4096,
             system: systemPrompt,
             messages: [
                 { role: 'user', content: contentBlock }
             ],
             temperature: 0.1
        });

        const firstBlock = msg.content?.[0];
        const aiResponseText = (firstBlock && 'text' in firstBlock) ? firstBlock.text : '';

        // Attempt to parse out the RAW JSON
        let parsed;
        try {
            // Strip out any trailing markdown if Claude disobeyed
            const cleaned = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch (e) {
            console.error("AI output failed to parse into JSON:", aiResponseText);
            throw new Error("AI extraction failed to produce valid JSON.");
        }

        if (!Array.isArray(parsed)) {
            parsed = [parsed];
        }

        // Sanitize category and ensure required fields are present
        const validCategories = Object.values(Category);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const finalProducts = parsed.map((item: any) => ({
            title: item.title?.substring(0, 100) || "Unknown Item",
            price: Number(item.price) || 0,
            description: item.description?.substring(0, 1000) || "",
            category: validCategories.includes(item.category) ? item.category : "OTHER",
            imageUrl: ""
        }));

        return NextResponse.json({ products: finalProducts }, { status: 200 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        console.error('AI Parse Error:', err);
        return NextResponse.json({ message: err.message || 'Error processing document via AI.' }, { status: 500 });
    }
}
