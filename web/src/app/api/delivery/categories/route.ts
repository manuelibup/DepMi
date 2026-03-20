import { NextResponse } from 'next/server'

/** Temporary debug endpoint — delete after confirming live category IDs */
export async function GET() {
    const res = await fetch('https://api.shipbubble.com/v1/shipping/labels/categories', {
        headers: {
            Authorization: `Bearer ${process.env.SHIPBUBBLE_API_KEY}`,
            'Content-Type': 'application/json',
        },
    })
    const json = await res.json()
    return NextResponse.json({ status: res.status, body: json })
}
