import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Category } from '@prisma/client';

const demandUpdateSchema = z.object({
    text: z.string().min(10, "Request must be at least 10 characters").max(500, "Request is too long"),
    category: z.nativeEnum(Category),
    budget: z.number().min(100, "Max budget must be at least ₦100"),
    budgetMin: z.number().min(0).optional(),
    currency: z.string().default("₦"),
    location: z.string().optional(),
    images: z.array(z.string()).optional(),
    videoUrl: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const demand = await prisma.demand.findUnique({
            where: { id }
        });

        if (!demand) {
            return NextResponse.json({ message: 'Demand not found' }, { status: 404 });
        }

        if (demand.userId !== session.user.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = demandUpdateSchema.safeParse(body);

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

        // Delete existing images. We recreate them in the correct order to handle edit changes perfectly
        await prisma.demandMedia.deleteMany({
            where: { demandId: id }
        });

        const updatedDemand = await prisma.demand.update({
            where: { id },
            data: {
                text,
                category,
                budget,
                budgetMin: budgetMin ?? null,
                currency,
                location,
                videoUrl,
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

        return NextResponse.json({ message: 'Demand successfully updated', demand: updatedDemand }, { status: 200 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Demand Update Error:', error);
        return NextResponse.json(
            { message: 'Internal server error while updating demand' },
            { status: 500 }
        );
    }
}
