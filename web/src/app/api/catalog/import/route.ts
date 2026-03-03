import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { Category } from "@prisma/client";

// Zod schema for individual products
const ProductRowSchema = z.object({
    title: z.string().min(1, "Title is required").max(100),
    description: z.string().max(1000).optional().nullable(),
    price: z.coerce.number().min(0, "Price cannot be negative"),
    category: z.nativeEnum(Category).catch(Category.OTHER),
    imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

// CSV Injection Defenses: Strip or neutralize leading formulas (=, +, -, @)
const sanitizeCsvString = (input?: string | null) => {
    if (!input) return input;
    const trimmed = input.trim();
    if (['=', '+', '-', '@'].includes(trimmed.charAt(0))) {
        return `'${trimmed}`; // Prepend tick to neutralize formula execution in Excel/Sheets downstream
    }
    return trimmed;
};

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
        }

        const body = await req.json();
        const { storeSlug, products } = body;

        if (!storeSlug || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ message: "Invalid payload. 'storeSlug' and a non-empty 'products' array are required." }, { status: 400 });
        }

        // Limit the batch size against massive payloads
        if (products.length > 500) {
            return NextResponse.json({ message: "Maximum of 500 products can be imported per batch." }, { status: 400 });
        }

        // Verify the user owns the store
        const store = await prisma.store.findFirst({
            where: { slug: storeSlug, ownerId: session.user.id }
        });

        if (!store) {
            return NextResponse.json({ message: "Store not found or you don't have permission." }, { status: 403 });
        }

        // Validate and sanitize the entire array
        const sanitizedData: z.infer<typeof ProductRowSchema>[] = [];
        const errors: { row: number; title: string; issues: string }[] = [];

        for (let i = 0; i < products.length; i++) {
            const rawRow = products[i];

            // Manual sanitization before Zod validation
            const preSanitized = {
                title: sanitizeCsvString(rawRow.title),
                description: sanitizeCsvString(rawRow.description),
                price: rawRow.price,
                category: rawRow.category?.toUpperCase() || "OTHER",
                imageUrl: rawRow.imageUrl,
            };

            const parsed = ProductRowSchema.safeParse(preSanitized);

            if (!parsed.success) {
                errors.push({
                    row: i + 1,
                    title: rawRow.title || 'Unknown',
                    issues: parsed.error.issues.map(iss => iss.message).join(', ')
                });
            } else {
                sanitizedData.push(parsed.data);
            }
        }

        // Return 422 if ANY row fails Zod validation (Atomic fail)
        if (errors.length > 0) {
            return NextResponse.json({ 
                message: "Validation failed for some rows.", 
                errors 
            }, { status: 422 });
        }

        // Atomic Database Insert via Transaction
        await prisma.$transaction(async (tx) => {
            for (const item of sanitizedData) {
                const product = await tx.product.create({
                    data: {
                        storeId: store.id,
                        title: item.title,
                        description: item.description,
                        price: item.price,
                        category: item.category,
                        inStock: true
                    }
                });

                // Attach Image if provided
                if (item.imageUrl) {
                    await tx.productImage.create({
                        data: {
                            productId: product.id,
                            url: item.imageUrl,
                            order: 0
                        }
                    });
                }
            }
        });

        return NextResponse.json({
            message: `Successfully imported ${sanitizedData.length} products.`,
            count: sanitizedData.length
        }, { status: 201 });

    } catch (error: unknown) {
        console.error("Batch Import Error:", error);
        return NextResponse.json({ message: "Internal server error during import" }, { status: 500 });
    }
}
