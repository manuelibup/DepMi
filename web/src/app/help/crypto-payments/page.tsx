import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Crypto Payments — DepMi Help",
  description: "Learn how to pay and receive payments using USDC on Base on DepMi.",
};


export default function CryptoPaymentsHelpPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", color: "var(--text-main)" }}>
      <Link href="/help" style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 24 }}>
        ← Help Center
      </Link>

      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, marginBottom: 8 }}>Crypto Payments on DepMi</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: 40 }}>
        Pay and get paid from anywhere in the world using USDC — a digital dollar — on the Base network.
      </p>

      {/* Section 1 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>What is USDC?</h2>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
          USDC is a <strong>digital dollar</strong>. 1 USDC is always worth approximately $1 USD — it doesn&apos;t go up or down in value like Bitcoin or Ethereum. It&apos;s designed specifically for payments and transfers.
        </p>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginTop: 8 }}>
          <strong>1 USDC ≈ ₦1,600</strong> (rate updates with the market).
        </p>
      </section>

      {/* Section 2 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>What is Base?</h2>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
          Base is a fast, low-cost payment network built by Coinbase. Sending USDC on Base costs less than ₦20 per transaction — much cheaper than international wire transfers.
        </p>
      </section>

      {/* Section 3 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>How does my wallet work?</h2>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
          When you enable crypto payments (as a seller) or choose to pay with crypto (as a buyer), DepMi automatically creates a wallet for you using your account email. You don&apos;t need to download any apps or save seed phrases.
        </p>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginTop: 8 }}>
          Your wallet is <strong>self-custodial</strong> — DepMi cannot access your funds. You always own your USDC.
        </p>
      </section>

      {/* Section 4 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>How is my money protected?</h2>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
          All crypto payments go into a <strong>smart contract escrow</strong> — not DepMi&apos;s wallet, and not the seller&apos;s wallet. The contract holds the USDC until you confirm delivery. If there&apos;s a problem, you can open a dispute and our team reviews it.
        </p>
        <ul style={{ color: "var(--text-secondary)", lineHeight: 2, paddingLeft: 20, marginTop: 8 }}>
          <li>Seller ships → you confirm receipt → USDC releases to seller automatically</li>
          <li>Problem? Open a dispute → DepMi reviews → funds go to the correct party</li>
          <li>Seller cancels → you get a full refund, no fee</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>How do I convert USDC to Naira?</h2>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
          DepMi doesn&apos;t handle currency conversion — your USDC lands directly in your wallet and is yours to convert however you prefer using any crypto exchange of your choice.
        </p>
      </section>

      {/* Section 6 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>What are the fees?</h2>
        <div style={{ border: "1.5px solid var(--card-border)", borderRadius: 12, overflow: "hidden" }}>
          {[
            { label: "Buyer service fee", value: "5%" },
            { label: "Seller platform fee (at payout)", value: "5%" },
            { label: "Network gas fee", value: "~₦15 (sponsored by DepMi)" },
          ].map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < 2 ? "1px solid var(--card-border)" : "none", fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>{row.label}</span>
              <span style={{ fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 8 }}>
          No hidden fees. Refunds on seller-fault cancellations are 100% — no fee deducted.
        </p>
      </section>

      {/* Section 7 */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>I&apos;m new to crypto. Is this safe?</h2>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)" }}>
          Yes. You don&apos;t need to understand how blockchain works to use crypto payments on DepMi. We handle the technical parts. Your wallet is created automatically, gas fees are covered, and the escrow contract protects your funds.
        </p>
        <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginTop: 8 }}>
          If you ever get stuck, you can always use <strong>naira payment</strong> (card/bank/USSD) instead — it works exactly the same way.
        </p>
      </section>

      <div style={{ padding: "20px 24px", borderRadius: 12, background: "rgba(var(--primary-rgb),0.06)", border: "1px solid rgba(var(--primary-rgb),0.2)", marginTop: 16 }}>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          Still have questions?{" "}
          <Link href="/help" style={{ color: "var(--primary)", fontWeight: 600 }}>Visit the Help Center</Link>
          {" "}or message us directly in the app.
        </p>
      </div>
    </main>
  );
}
