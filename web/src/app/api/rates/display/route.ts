/**
 * GET /api/rates/display
 * Returns current display rates for NGN → all supported currencies.
 * Used by product cards and checkout for localised price display.
 * Cached 1 hour via ExchangeRate-API.
 */

import { NextResponse } from "next/server";
import { getDisplayRates } from "@/lib/currency";

export const revalidate = 3600; // ISR: 1hr

export async function GET() {
  try {
    const { rates, symbols } = await getDisplayRates();
    return NextResponse.json({ rates, symbols });
  } catch {
    return NextResponse.json({ error: "Failed to fetch rates" }, { status: 500 });
  }
}
