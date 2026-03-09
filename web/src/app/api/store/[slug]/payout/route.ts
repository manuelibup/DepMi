import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getBankList, resolveAccountName } from '@/lib/flutterwave';
import { z } from 'zod';

const payoutSchema = z.object({
    bankCode: z.string().min(3),
    bankAccountNo: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
    bankAccountName: z.string().min(2),
});

// GET — return current payout details + full bank list for the dropdown
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { slug } = await params;
        const store = await prisma.store.findUnique({
            where: { slug },
            select: { id: true, ownerId: true, bankCode: true, bankAccountNo: true, bankAccountName: true },
        });

        if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

        const banks = await getBankList();

        return NextResponse.json({
            bankCode: store.bankCode,
            bankAccountNo: store.bankAccountNo,
            bankAccountName: store.bankAccountName,
            banks,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Payout GET error:', error);
        return NextResponse.json({ message: 'Failed to load payout details' }, { status: 500 });
    }
}

import { verifyOtp } from '@/lib/otp';

// ... existing code ...

// PATCH — save bank account details
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { slug } = await params;
        const store = await prisma.store.findUnique({
            where: { slug },
            select: { id: true, ownerId: true },
        });

        if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

        const body = await req.json();
        const { code, ...payoutData } = body;

        if (!code) return NextResponse.json({ message: 'Verification code required' }, { status: 400 });

        const isOtpValid = await verifyOtp(session.user.id, 'ACCOUNT_UPDATE', code);
        if (!isOtpValid) return NextResponse.json({ message: 'Invalid or expired code' }, { status: 400 });

        const parsed = payoutSchema.safeParse(payoutData);
        if (!parsed.success) return NextResponse.json({ message: 'Invalid input', errors: parsed.error.format() }, { status: 400 });

        const { bankCode, bankAccountNo, bankAccountName } = parsed.data;

        await prisma.store.update({
            where: { id: store.id },
            data: { bankCode, bankAccountNo, bankAccountName },
        });

        return NextResponse.json({ message: 'Payout account saved' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Payout PATCH error:', error);
        return NextResponse.json({ message: 'Failed to save payout account' }, { status: 500 });
    }
}

// POST — resolve account name (called on-blur in the form)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { slug } = await params;
        const store = await prisma.store.findUnique({
            where: { slug },
            select: { ownerId: true },
        });
        if (!store) return NextResponse.json({ message: 'Store not found' }, { status: 404 });
        if (store.ownerId !== session.user.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });

        const { accountNumber, bankCode } = await req.json();
        if (!accountNumber || !bankCode) return NextResponse.json({ message: 'Missing fields' }, { status: 400 });

        const accountName = await resolveAccountName(accountNumber, bankCode);
        return NextResponse.json({ accountName });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Resolve account error:', error);
        return NextResponse.json({ message: error.message ?? 'Could not verify account' }, { status: 422 });
    }
}
