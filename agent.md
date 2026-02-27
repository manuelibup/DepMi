# DepMi (Buy Here) - Project Blueprint

## Table of Contents
- [1. Core Vision](#1-core-vision)
- [2. Foundational Features](#2-foundational-features)
- [3. Brand Identity (Tech + Culture)](#3-brand-identity-tech--culture)
- [4. Financial & Regulatory Model (Phase 1)](#4-financial--regulatory-model-phase-1)
- [5. 6-Week MVP Roadmap](#5-6-week-mvp-roadmap)
- [6. Data Architecture (Current Schema)](#6-data-architecture-current-schema)
- [7. Development Guidelines](#7-development-guidelines)

## 1. Core Vision
DepMi ("Buy Here" in Ibibio) is a social commerce operating system designed for African entrepreneurs. It bridges the gap between social discovery (Instagram/Facebook) and structured commerce (Shopify/Jumia).

**Motto:** Buy Here. Build Here. Grow Here.

---

## 2. Foundational Features

### A. User/Store Architecture (Facebook Pages Model)
- **Personal Account (User):** Every user starts as a buyer. Auth, KYC, purchasing, and demands live here.
- **Business Account (Store):** A separate entity, like a Facebook Page. A user can own 0, 1, or many stores.
- **KYC Gate:** Users must complete **BVN verification (TIER_2)** before they can create a Store.
- **Account Switching:** Users can switch between their personal account and any store they own (like Facebook profile ↔ Pages).

### B. Multi-Provider Auth
- **Email + Password** (bcrypt hashed, 12+ salt rounds — never plaintext)
- **Google OAuth** (subject ID stored)
- **WhatsApp** (phone verification)
- Users can link multiple providers to one account (e.g. sign up with email, link Google later).
- All auth records live in the `Account` table, referencing a single `User`.

### C. The "Deps" System (Credibility Currency)
- **Concept:** A trust score based on real transaction history — tracked via `DepTransaction` audit table.
- **Dual Scoring:** Buyers earn Deps on their personal account. Sellers earn Deps on their Store.
- **Metric:** 1 Dep = 1 Completed Purchase (buyer) or 1 Completed Sale (store).
- **Tiers:**
  - 🌱 **Seedling** (0–50 Deps)
  - ⭐ **Rising** (51–200 Deps)
  - 🔥 **Trusted** (201–500 Deps)
  - 💎 **Elite** (501–1000 Deps)
  - 🏆 **Legend** (1000+ Deps)
- **Why it works:** Prevents off-platform transactions because users want to "earn Deps" for visibility and trust.

### D. Tiered KYC Verification
- **UNVERIFIED:** Can browse and create demands.
- **TIER_0:** Social accounts linked (IG/FB/X) — can bid (limited).
- **TIER_1:** NIN verified — can buy via escrow.
- **TIER_2:** BVN verified — **can CREATE A STORE, sell, receive payouts.**
- **TIER_3:** Proof of address — full access, higher transaction limits.
- **BUSINESS:** CAC + TIN verified — highest limits.

### E. @DepMiBot (The Onboarding Hack)
- **Workflow:** Vendor tags `@depmibot` on an Instagram/Facebook post.
- **AI Logic:** Bot scans image + caption → extracts Price/Title/Size → creates a draft listing on DepMi.
- **Goal:** Zero manual data entry for busy vendors.

### F. The Demand Engine (Product Requests)
- **Feature:** Buyers post "Looking for [Product] + [Budget] + [Location]".
- **Loop:** Relevant store owners get notified to "Bid" with their listings.
- **Bid→Product Link:** Vendors can attach an existing product from their store when bidding.
- **Order Tracing:** Orders track their origin (Demand + Bid), so the demand→bid→order flow is auditable.

---

## 3. Brand Identity (Tech + Culture)

### Visual Strategy
- **Primary Color:** Vibrant Green (#00C853) — Represents money, growth, and trust.
- **Accent Color:** Gold (#FFD600) — Reserved for Legend/Premium status.
- **Design Motif:** "Tech-Weave" — Geometric, sharp UI with subtle African basket-weave patterns.

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

### **Phase 1: Identity & Trust (Weeks 1–2)**
*   **W1: Auth & Profiles:** Implement Email/Password + Google + WhatsApp auth (Account model). User creation with personal profiles.
*   **W2: KYC & Deps:** Integrate Smile ID/Dojah for tiered KYC (NIN → BVN → Address). Build Deps system (DepTransaction audit trail + atomic counter).

### **Phase 2: Discovery & Demand (Weeks 3–4)**
*   **W3: Stores & Products:** KYC-gated Store creation (TIER_2+). Vendor listing flow (Photos via ProductImage, Price, Inventory). Public storefronts (`depmi.com/store/[slug]`).
*   **W4: The Demand Engine:** "Product Request" feed. Bid system (vendor attaches product). Search (Meilisearch) to match demands to listings.

### **Phase 3: Transactions & Logistics (Weeks 5–6)**
*   **W5: Secure Payments:** Paystack Split Payments with escrow. Order creation from accepted bids (origin tracing: demandId + bidId).
*   **W6: The Loop:** Order status tracking (7 statuses). "Confirm Receipt" triggers vendor payout + Dep for both parties. Notification system (10 event types). Launch Pilot with first 20 vendors.

---

## 6. Data Architecture (Current Schema)
- **User** — Personal identity, auth, buying, trust (buyer Deps).
- **Account** — Multi-provider auth records (Email/Google/WhatsApp).
- **KycStatus** — Tiered verification (stores Smile ID/Dojah reference tokens only).
- **Store** — Business identity (like Facebook Pages). Owned by User. Has its own Dep score.
- **Product + ProductImage** — Catalog with multi-image carousel support.
- **Demand + Bid** — Demand Engine: buyer requests, vendor bids (can attach Product).
- **Order + OrderItem** — Escrow orders with origin tracing (Demand → Bid → Order).
- **DepTransaction** — Audit trail for trust scores (buyer + seller tracked separately).
- **Notification** — 10 typed events (BID_RECEIVED, ORDER_PLACED, FUNDS_RELEASED, etc.).

---

## 7. Development Guidelines
- **Web-First MVP:** Prioritize a frictionless Next.js web application first. No forced app downloads.
- **Communication:** Use WhatsApp/Telegram over native push notifications for vendor alerts.
- **Trust Over Profit:** Prioritize escrow safety and Dep accuracy over aggressive monetization.
- **Speed to Market:** Ship the Demand Engine early; polish the social feed later.
- **Documentation:** Always update `logs.md`, `tips.md`, and `agent.md` after every session. See `.agents/workflows/update-docs.md`.
