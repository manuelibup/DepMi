import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Crypto payments are not yet available.' },
        { status: 503 }
    );
}
