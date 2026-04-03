import { prisma } from './prisma';

/**
 * Fire-and-forget: use Groq (Llama 3.1) to match a demand to relevant products.
 * Stores up to 3 product IDs in demand.aiMatchedProductIds.
 *
 * No PII is sent — only product titles, prices, categories, and the demand text
 * (all public-facing content already visible on the feed).
 */
export async function matchDemandToProducts(
    demandId: string,
    text: string,
    category: string,
): Promise<void> {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) return;

    // Fetch recent in-stock products — same category first, then any
    const allProducts = await prisma.product.findMany({
        where: { inStock: true, isPortfolioItem: false },
        select: { id: true, title: true, price: true, category: true },
        orderBy: { createdAt: 'desc' },
        take: 40,
    });

    if (allProducts.length === 0) return;

    // Prefer same-category pool; fall back to full list if too small
    const sameCategory = allProducts.filter(p => p.category === category);
    const pool = sameCategory.length >= 3 ? sameCategory : allProducts;

    const productList = pool
        .slice(0, 25)
        .map((p, i) => `${i + 1}. ID:${p.id} | ${p.title} | ₦${Number(p.price).toLocaleString()}`)
        .join('\n');

    const prompt = `A buyer posted this request: "${text}"

Available products on the platform:
${productList}

Return the IDs of the top 3 products that best match what the buyer is looking for.
Reply with ONLY a JSON array of IDs. Example: ["id1","id2","id3"]
If fewer than 3 match well, return fewer. If nothing matches, return [].`;

    try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 120,
                temperature: 0.1,
            }),
            signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) return;

        const data = await res.json();
        const content: string = data.choices?.[0]?.message?.content ?? '';

        // Extract JSON array from response (model sometimes adds extra text)
        const match = content.match(/\[[\s\S]*?\]/);
        if (!match) return;

        const ids: unknown[] = JSON.parse(match[0]);
        if (!Array.isArray(ids)) return;

        // Only keep IDs that actually exist in our pool (prevents hallucinations)
        const poolIds = new Set(pool.map(p => p.id));
        const validIds = (ids as string[]).filter(id => typeof id === 'string' && poolIds.has(id)).slice(0, 3);

        if (validIds.length === 0) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.demand as any).update({
            where: { id: demandId },
            data: { aiMatchedProductIds: validIds },
        });
    } catch {
        // Silently swallow — this is a non-critical background enhancement
    }
}
