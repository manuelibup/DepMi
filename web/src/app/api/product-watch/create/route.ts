import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

import { z } from 'zod';

const watchSchema = z.object({
    searchQuery: z.string().max(200).optional(),
    productId: z.string().uuid().optional(),
}).refine(data => data.searchQuery || data.productId, {
    message: "Must provide either searchQuery or productId"
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const parsed = watchSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ message: 'Invalid format', errors: parsed.error.format() }, { status: 400 });
        }

        const { searchQuery, productId } = parsed.data;

        // Deduplication Check
        const existingWatch = await prisma.productWatch.findFirst({
            where: {
                userId: session.user.id,
                searchQuery: searchQuery || null,
                productId: productId || null,
            }
        });

        if (existingWatch) {
            return NextResponse.json({ message: 'Watch already exists', watch: existingWatch }, { status: 200 });
        }

        const watch = await prisma.productWatch.create({
            data: {
                userId: session.user.id,
                searchQuery,
                productId,
            }
        });

        return NextResponse.json({ message: 'Product watch created', watch }, { status: 201 });

     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('ProductWatch Creation Error:', error);
        return NextResponse.json({ message: 'Internal server error while creating product watch' }, { status: 500 });
    }
}
