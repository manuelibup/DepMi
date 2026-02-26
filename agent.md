# DepMi (Buy Here) - Project Blueprint

## 1. Core Vision
DepMi ("Buy Here" in Ibibio) is a social commerce operating system designed for African entrepreneurs. It bridges the gap between social discovery (Instagram/Facebook) and structured commerce (Shopify/Jumia).

**Motto:** Buy Here. Build Here. Grow Here.

---

## 2. Foundational Features

### A. The "Deps" System (Credibility Currency)
- **Concept:** A combined trust score based on real transaction history.
- **Metric:** 1 Dep = 1 Completed Purchase or 1 Completed Sale.
- **Tiers:** 
  - 🌱 **Seedling** (0-50 Deps)
  - ⭐ **Rising** (51-200 Deps)
  - 🔥 **Trusted** (201-500 Deps)
  - 💎 **Elite** (501-1000 Deps)
  - 🏆 **Legend** (1000+ Deps)
- **Why it works:** It prevents "off-platform" transactions because users want to "earn their Deps" to build visibility and trust.

### B. Tiered Verification (KYC/KYB)
- **Tier 0:** Social Verification (Linking IG/FB/X/TikTok).
- **Tier 1:** NIN (National Identity Number).
- **Tier 2:** BVN (Bank Verification Number).
- **Tier 3:** Proof of Residency (Utility Bills).
- **Business:** CAC (RC Number) & TIN (Tax ID) via API (Kora/Smile ID).

### C. @DepMiBot (The Onboarding Hack)
- **Workflow:** Vendor tags `@depmibot` on an Instagram/Facebook post.
- **AI Logic:** Bot scans image + caption -> extracts Price/Title/Size -> creates a draft listing on DepMi.
- **Goal:** Zero manual data entry for busy vendors.

### D. The Demand Engine (Product Requests)
- **Feature:** Buyers post "Looking for [Product] + [Budget] + [Location]".
- **Loop:** Relevant vendors get notified to "Bid" with their listings.

---

## 3. Brand Identity (Tech + Culture)

### Visual Strategy
- **Primary Color:** Vibrant Green (#00C853) - Represents money, growth, and trust.
- **Accent Color:** Gold (#FFD600) - Reserved for Legend/Premium status.
- **Design Motif:** "Tech-Weave" - Geometric, sharp UI components with subtle African basket-weave patterns in the background/borders.

### Logo Concept: The M-in-D Monogram
- **The "D" (Outer):** Represents "Dep" (The Platform/Security). It is the protective shell.
- **The "M" (Inner):** Represents "Mi" (The Market/Merchant).
- **Culture Layer:** The strokes of the "D" use a stylized weave pattern.
- **Tech Layer:** Sharp, mathematical geometry and vibrant digital gradients.

---

## 4. Financial & Regulatory Model (Phase 1)
- **Gateway:** Flutterwave (Primary - 1.4% fee) / Paystack (Secondary).
- **Platform Fee:** 5% per transaction (Deducted via Transaction Splits).
- **Wallet Strategy:** No internal holding of funds in Phase 1 (Avoids ₦4B CBN requirement). Funds auto-settle to vendor bank accounts (T+1).
- **Withdrawal Fee:** 0.5% (Introduced in Phase 2 with Partner Wallets).

---

## 5. 6-Week MVP Roadmap
This roadmap focuses on shipping the **Demand Engine** and the **Trust Loop** (Deps) to prove the core concept within 42 days.

### **Phase 1: Identity & Trust (Weeks 1-2)**
*   **W1: Multi-Channel Auth:** Implement WhatsApp/Google Auth (passwordless). Create Dual-Role profiles (every user can buy/sell).
*   **W2: Credibility Core:** Build the **"Deps" system** logic (transaction auto-increment). Integrate Basic KYC (Smile ID/Dojah for NIN).

### **Phase 2: Discovery & Demand (Weeks 3-4)**
*   **W3: Product Engine:** Vendor listing flow (Photos, Price, Inventory). Public storefront pages (`depmi.com/store-name`).
*   **W4: The Demand Engine:** Build the **"Product Request" feed**. Implement Search (Meilisearch) to match requests to existing items.

### **Phase 3: Transactions & Logistics (Weeks 5-6)**
*   **W5: Secure Payments:** Paystack **Split Payments** with Escrow-light (funds locked until confirmation).
*   **W6: The Loop:** Order status tracking (Ordered -> Shipped -> Delivered). "Confirm Receipt" button to trigger vendor payouts. Launch Pilot with first 20 vendors.

---

## 6. Development Guidelines
- **Web-First MVP:** Prioritize a frictionless Next.js web application first. No forced app downloads (unlike Temu).
- **Communication:** Use WhatsApp/Telegram over native push notifications for vendor alerts.
- **Trust Over Profit:** Prioritize escrow safety and Dep accuracy over aggressive monetization.
- **Speed to Market:** Ship the Demand Engine early; polish the social feed later.
