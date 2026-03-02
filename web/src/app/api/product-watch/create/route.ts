import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { searchQuery, productId } = body;

        if (!searchQuery && !productId) {
            return NextResponse.json({ message: 'Must provide either searchQuery or productId' }, { status: 400 });
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
