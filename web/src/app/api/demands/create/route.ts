import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Category } from '@prisma/client';

const demandSchema = z.object({
    text: z.string().min(10, "Request must be at least 10 characters").max(500, "Request is too long"),
    category: z.nativeEnum(Category),
    budget: z.number().min(100, "Max budget must be at least ₦100"),
    budgetMin: z.number().min(0).optional(),
    currency: z.string().default("₦"),
    location: z.string().optional(),
    images: z.array(z.string()).optional(),
    videoUrl: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = demandSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { message: 'Invalid format', errors: parsed.error.format() },
                { status: 400 }
            );
        }

        const { text, category, budget, budgetMin, currency, location, images, videoUrl } = parsed.data;

        if (budgetMin !== undefined && budgetMin >= budget) {
            return NextResponse.json({ message: 'Min budget must be less than max budget' }, { status: 400 });
        }

        // NOTE: We do not limit buyers from creating demands based on KYC alone,
        // UNVERIFIED users can browse and create demands (from agent.md).

        const demand = await prisma.demand.create({
            data: {
                userId: session.user.id,
                text,
                category,
                budget,
                budgetMin: budgetMin ?? null,
                currency,
                location,
                videoUrl,
                isActive: true,
                images: images ? {
                    create: images.map((url, index) => ({
                        url,
                        order: index
                    }))
                } : undefined
            },
            include: {
                images: true
            }
        });

        return NextResponse.json({ message: 'Demand successfully posted', demand }, { status: 201 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Demand Creation Error:', error);
        return NextResponse.json(
            { message: 'Internal server error while creating demand' },
            { status: 500 }
        );
    }
}
