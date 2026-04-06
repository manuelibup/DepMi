import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crypto Payment — DepMi",
};

export default function CryptoCheckoutPage() {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--text-muted)" }}>
      <p>Crypto payments are coming soon.</p>
    </div>
  );
}
