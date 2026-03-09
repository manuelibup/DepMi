import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveAccountName } from '@/lib/flutterwave';

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const accountNumber = searchParams.get('accountNumber');
        const bankCode = searchParams.get('bankCode');

        if (!accountNumber || !bankCode) {
            return NextResponse.json({ message: 'accountNumber and bankCode are required' }, { status: 400 });
        }

        const accountName = await resolveAccountName(accountNumber, bankCode);
        return NextResponse.json({ accountName });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Resolve account error:', error);
        return NextResponse.json({ message: error.message ?? 'Could not verify account' }, { status: 422 });
    }
}
