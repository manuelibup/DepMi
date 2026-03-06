import { NextRequest, NextResponse } from 'next/server';
import { resolveAccountName } from '@/lib/monnify';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const bankCode = searchParams.get('bankCode');

    if (!accountNumber || !bankCode) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    try {
        const accountName = await resolveAccountName(accountNumber, bankCode);
        return NextResponse.json({ accountName });
    } catch (error: any) {
        console.error('[api/banks/resolve]', error);
        return NextResponse.json({ error: error?.message || 'Failed to resolve account name' }, { status: 400 });
    }
}
