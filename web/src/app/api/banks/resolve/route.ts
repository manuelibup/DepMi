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
        console.error('[resolve-account] Paystack error:', error?.message, '| bankCode:', new URL(req.url).searchParams.get('bankCode'));

        // Map common Flutterwave errors to user-friendly messages
        const flwMsg = (error?.message || '').toLowerCase();
        let userMessage = 'Could not verify this account. Please double-check the account number and bank.';

        if (flwMsg.includes('could not verify') || flwMsg.includes('could not resolve')) {
            userMessage = 'Account not found. Please check the account number is correct for this bank.';
        } else if (flwMsg.includes('no bank found') || flwMsg.includes('bank not found')) {
            userMessage = 'This bank is not currently supported for account verification. You can still save other bank details.';
        } else if (flwMsg.includes('timeout') || flwMsg.includes('connect')) {
            userMessage = 'Sorry, we could not connect to your bank. Please try again in a moment.';
        }

        return NextResponse.json({ message: userMessage }, { status: 422 });
    }
}
