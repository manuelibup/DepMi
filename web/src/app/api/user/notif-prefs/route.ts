import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { Category } from '@prisma/client';

const schema = z.object({
    notifDemandCategories: z.array(z.nativeEnum(Category)),
});

export async function PATCH(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ message: 'Invalid data' }, { status: 400 });
    }

    await prisma.user.update({
        where: { id: session.user.id },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { notifDemandCategories: parsed.data.notifDemandCategories } as any,
    });

    return NextResponse.json({ message: 'Preferences saved' });
}
