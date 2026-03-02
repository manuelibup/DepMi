import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const waitlistSchema = z.object({
    email: z.string().email(),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = waitlistSchema.parse(body);

        const existing = await prisma.waitlist.findUnique({
            where: { email },
        });

        if (existing) {
            return NextResponse.json(
                { message: 'You are already on the waitlist!' },
                { status: 400 }
            );
        }

        await prisma.waitlist.create({
            data: { email },
        });

        return NextResponse.json({ message: 'Successfully joined waitlist' });
     
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Waitlist POST error:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { message: 'Please enter a valid email address.' },
                { status: 400 }
            );
        }
        return NextResponse.json(
            {
                message: 'Something went wrong.',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Database error or missing configuration'
            },
            { status: 500 }
        );
    }
}
