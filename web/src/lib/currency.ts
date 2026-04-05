/**
 * Currency detection + formatting for DepMi international UX.
 *
 * Sellers list prices in NGN. This module converts for display only.
 * Actual Flutterwave payment uses the detected currency via their hosted page.
 * Crypto payments always use USDC regardless of detected currency.
 *
 * Rate source: ExchangeRate-API (free tier, cached 1hr in memory).
 * Fallback: hardcoded approximate rates (refreshed by dev if stale).
 */

import type { NextRequest } from "next/server";

// ── Supported currencies ──────────────────────────────────────────────────────

export type SupportedCurrency =
  | "NGN" // Nigeria
  | "USD" // USA / default international
  | "GBP" // UK
  | "EUR" // EU
  | "GHS" // Ghana
  | "KES" // Kenya
  | "ZAR" // South Africa
  | "UGX" // Uganda
  | "TZS" // Tanzania
  | "RWF" // Rwanda
  | "XOF" // West Africa CFA (Senegal, Ivory Coast, etc.)
  | "ETB"; // Ethiopia

// country code → currency
const COUNTRY_CURRENCY_MAP: Record<string, SupportedCurrency> = {
  NG: "NGN",
  US: "USD",
  CA: "USD",
  AU: "USD",
  GB: "GBP",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  ES: "EUR",
  IT: "EUR",
  PT: "EUR",
  GH: "GHS",
  KE: "KES",
  ZA: "ZAR",
  UG: "UGX",
  TZ: "TZS",
  RW: "RWF",
  SN: "XOF",
  CI: "XOF",
  ML: "XOF",
  BF: "XOF",
  ET: "ETB",
};

// currency → display symbol
export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  NGN: "₦",
  USD: "$",
  GBP: "£",
  EUR: "€",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
  UGX: "USh",
  TZS: "TSh",
  RWF: "RWF",
  XOF: "CFA",
  ETB: "ETB",
};

// ── Fallback rates (NGN per 1 unit of currency) ───────────────────────────────
// Updated Mar 2026. Refreshed via ExchangeRate-API in production.
const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  NGN: 1,
  USD: 1650,
  GBP: 2080,
  EUR: 1790,
  GHS: 112,
  KES: 12.8,
  ZAR: 88,
  UGX: 0.44,
  TZS: 0.65,
  RWF: 1.2,
  XOF: 2.73,
  ETB: 29,
};

// ── Rate cache (in-memory, 1 hour TTL) ───────────────────────────────────────

let rateCache: {
  rates: Record<SupportedCurrency, number>;
  fetchedAt: number;
} | null = null;

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchRates(): Promise<Record<SupportedCurrency, number>> {
  if (rateCache && Date.now() - rateCache.fetchedAt < CACHE_TTL_MS) {
    return rateCache.rates;
  }

  try {
    // ExchangeRate-API free tier: base is USD, we need NGN per foreign currency
    // So we fetch USD→others, then use NGN/USD rate to get NGN→others
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) throw new Error("No EXCHANGE_RATE_API_KEY");

    const res = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/NGN`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error("Rate API failed");

    const data = await res.json();
    // data.conversion_rates: { USD: 0.000606, GBP: ... } = 1 NGN → X foreign
    // We want NGN per 1 unit of foreign: 1 / data.conversion_rates[currency]

    const conversions = data.conversion_rates as Record<string, number>;
    const rates = {} as Record<SupportedCurrency, number>;

    for (const [currency, ngnPerUnit] of Object.entries(FALLBACK_RATES)) {
      const c = currency as SupportedCurrency;
      if (c === "NGN") { rates[c] = 1; continue; }
      const foreignPerNgn = conversions[c];
      rates[c] = foreignPerNgn ? Math.round(1 / foreignPerNgn) : ngnPerUnit;
    }

    rateCache = { rates, fetchedAt: Date.now() };
    return rates;
  } catch {
    // fallback to hardcoded rates
    return FALLBACK_RATES;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect the user's currency from Vercel's IP country header.
 * Falls back to NGN (default for DepMi's primary market).
 */
export function detectCurrency(req: NextRequest): SupportedCurrency {
  const country = req.headers.get("x-vercel-ip-country") ?? "NG";
  return COUNTRY_CURRENCY_MAP[country] ?? "NGN";
}

/**
 * Get all current display rates (NGN → other currencies).
 * Returns { rates: Record<SupportedCurrency, number>, symbols: ... }
 */
export async function getDisplayRates() {
  const rates = await fetchRates();
  return { rates, symbols: CURRENCY_SYMBOLS };
}

/**
 * Convert an NGN amount to another currency for display.
 * Returns the converted amount (not formatted).
 */
export async function convertFromNgn(
  ngnAmount: number,
  targetCurrency: SupportedCurrency
): Promise<number> {
  if (targetCurrency === "NGN") return ngnAmount;
  const rates = await fetchRates();
  const ngnPerUnit = rates[targetCurrency] ?? FALLBACK_RATES[targetCurrency];
  return ngnAmount / ngnPerUnit;
}

/**
 * Format a converted amount with the correct symbol and decimal places.
 * Example: formatPrice(12.5, 'USD') → '$12.50'
 *          formatPrice(12000, 'NGN') → '₦12,000'
 */
export function formatPrice(amount: number, currency: SupportedCurrency): string {
  const symbol = CURRENCY_SYMBOLS[currency];

  if (currency === "NGN" || currency === "UGX" || currency === "TZS" || currency === "RWF") {
    // No decimals for high-value integer currencies
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }

  if (currency === "XOF" || currency === "ETB") {
    return `${symbol} ${Math.round(amount).toLocaleString()}`;
  }

  // 2 decimal places for USD, GBP, EUR, etc.
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Get both the formatted display price and the raw NGN amount.
 * Used in product cards for the tooltip pattern.
 */
export async function getPriceDisplay(
  ngnAmount: number,
  currency: SupportedCurrency
): Promise<{ display: string; ngnDisplay: string; rawConverted: number }> {
  const converted = await convertFromNgn(ngnAmount, currency);
  return {
    display: formatPrice(converted, currency),
    ngnDisplay: formatPrice(ngnAmount, "NGN"),
    rawConverted: converted,
  };
}

/**
 * Get the Flutterwave currency code for a detected currency.
 * Flutterwave accepts: NGN, USD, GBP, EUR, GHS, KES, ZAR, TZS, UGX, RWF
 * Falls back to NGN if unsupported.
 */
const FLUTTERWAVE_SUPPORTED: SupportedCurrency[] = [
  "NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR", "TZS", "UGX", "RWF",
];

export function getFlutterwaveCurrency(currency: SupportedCurrency): SupportedCurrency {
  return FLUTTERWAVE_SUPPORTED.includes(currency) ? currency : "NGN";
}
