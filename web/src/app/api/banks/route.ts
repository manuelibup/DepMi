import { NextResponse } from 'next/server';
import { getBankList } from '@/lib/paystack';

export async function GET() {
    try {
        const banks = await getBankList();
        return NextResponse.json({ banks });
    } catch (error) {
        console.error('[api/banks]', error);
        return NextResponse.json({ error: 'Failed to fetch banks' }, { status: 500 });
    }
}
