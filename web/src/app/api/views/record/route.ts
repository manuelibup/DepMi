import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { headers } from 'next/headers';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { productId, demandId } = await req.json();

        if (!productId && !demandId) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;
        const head = await headers();

        // Use X-Forwarded-For if available, otherwise fallback to a generic string
        const ip = head.get('x-forwarded-for') || 'unknown';
        const userAgent = head.get('user-agent') || 'unknown';

        // Create a privacy-preserving hash of the identifier
        const identifier = crypto
            .createHash('sha256')
            .update(`${ip}-${userAgent}-${userId || 'guest'}`)
            .digest('hex');

        const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        if (productId) {
            // Check for existing view in the last 24h
            const existingView = await (prisma as any).productView.findFirst({
                where: {
                    productId,
                    identifier,
                    createdAt: { gte: windowStart }
                }
            });

            if (!existingView) {
                // Record new view and increment
                await prisma.$transaction([
                    (prisma as any).productView.create({
                        data: { productId, userId, identifier }
                    }),
                    prisma.product.update({
                        where: { id: productId },
                        data: { viewCount: { increment: 1 } }
                    })
                ]);
                return NextResponse.json({ recorded: true });
            }
        } else if (demandId) {
            const existingView = await (prisma as any).demandView.findFirst({
                where: {
                    demandId,
                    identifier,
                    createdAt: { gte: windowStart }
                }
            });

            if (!existingView) {
                await prisma.$transaction([
                    (prisma as any).demandView.create({
                        data: { demandId, userId, identifier }
                    }),
                    (prisma.demand as any).update({
                        where: { id: demandId },
                        data: { viewCount: { increment: 1 } }
                    })
                ]);
                return NextResponse.json({ recorded: true });
            }
        }

        return NextResponse.json({ recorded: false, reason: 'duplicate' });

    } catch (error) {
        console.error('Error recording view:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
