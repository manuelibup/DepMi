/**
 * GET /api/rates/usdc-ngn
 * Returns the locked USDC/NGN rate for crypto checkout.
 *
 * Rate source priority:
 *   1. Quidax (Nigerian exchange, no API key, real NGN market rate)
 *   2. Yellow Card API (optional, real Nigerian P2P rate)
 *   3. CoinGecko (global spot price, free)
 *   4. Hardcoded fallback
 *
 * Includes 1.5% slippage buffer to protect against movement during checkout window.
 * Rate is cached 5 minutes server-side.
 */

import { NextResponse } from "next/server";

// ── Rate cache ────────────────────────────────────────────────────────────────

let cache: { ngnPerUsdc: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SLIPPAGE_BUFFER = 0.015; // 1.5%
const FALLBACK_NGN_PER_USDC = 1650; // updated Mar 2026

// ── Quidax (Nigerian exchange, no key required) ───────────────────────────────

async function fetchQuidax(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://www.quidax.com/api/v1/markets/usdcngn/tickers",
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    // sell = NGN received per 1 USDC sold — best proxy for real Nigerian rate
    const sell = parseFloat(data?.data?.ticker?.sell);
    return isNaN(sell) || sell <= 0 ? null : sell;
  } catch {
    return null;
  }
}

// ── Yellow Card API (optional) ────────────────────────────────────────────────

async function fetchYellowCard(): Promise<number | null> {
  const apiKey = process.env.YELLOW_CARD_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.yellowcard.io/v1/rates", {
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data?.rates?.find(
      (r: { from: string; to: string; rate: number }) => r.from === "USDC" && r.to === "NGN"
    );
    return pair?.rate ?? null;
  } catch {
    return null;
  }
}

// ── CoinGecko fallback ────────────────────────────────────────────────────────

async function fetchCoinGecko(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn",
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.["usd-coin"]?.ngn ?? null;
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET() {
  // Serve from cache if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ngnPerUsdc: cache.ngnPerUsdc, source: "cache", buffered: true });
  }

  // Fetch live rate — Quidax first, then Yellow Card, then CoinGecko
  let spotRate = await fetchQuidax();
  let source = "quidax";

  if (!spotRate) {
    spotRate = await fetchYellowCard();
    source = "yellow_card";
  }

  if (!spotRate) {
    spotRate = await fetchCoinGecko();
    source = "coingecko";
  }

  if (!spotRate) {
    spotRate = FALLBACK_NGN_PER_USDC;
    source = "fallback";
  }

  // Apply slippage buffer: buyer pays slightly more USDC for the same NGN amount
  const ngnPerUsdc = Math.round(spotRate * (1 - SLIPPAGE_BUFFER));

  cache = { ngnPerUsdc, fetchedAt: Date.now() };

  return NextResponse.json({ ngnPerUsdc, spotRate, source, buffered: true, bufferPercent: SLIPPAGE_BUFFER * 100 });
}
