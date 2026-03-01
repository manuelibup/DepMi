# DepMi (Buy Here) - Project Blueprint

## Table of Contents
- [1. Core Vision](#1-core-vision)
- [2. Foundational Features](#2-foundational-features) *(A–H)*
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
- **KYC Gate:** Store creation requires **BVN verification (TIER_2)**. For the MVP pilot, pilot vendors are manually elevated by admin. Dojah/Smile ID integration is added when Store creation demand scales (~seller #25+).
- **Account Switching:** Users can switch between their personal account and any store they own (like Facebook profile ↔ Pages).

### B. Waitlist Mode (Pre-launch Strategy)
- **Waitlist UI:** High-fidelity landing page with glassmorphism and animated background blobs.
- **Persistence:** Collects and validates email addresses in the `Waitlist` model via `/api/waitlist`.
- **Conditional Toggle:** Site conditionally renders the Waitlist based on the `NEXT_PUBLIC_SHOW_WAITLIST` environment variable.
- **Goal:** Public pre-launch phase to build hype and capture leads while dev continues.

### C. Multi-Provider Auth
- **Email + Password** (bcrypt hashed, 12+ salt rounds — never plaintext)
- **Google OAuth** (subject ID stored as `providerId` in Account table)
- **WhatsApp OTP** (phone verification — active in Week 2; primary verification path for buyers)
- Users can link multiple providers to one account (e.g. sign up with email, link Google later).
- All auth records live in the `Account` table, referencing a single `User`.
- **Implementation note:** Do NOT use `@next-auth/prisma-adapter`. DepMi's custom `Account` schema (`AuthProvider` enum, `providerId`, `passwordHash`) is incompatible with the adapter's expected format. Google OAuth is wired manually via the NextAuth `signIn` callback.

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
- **TIER_0:** Email + phone OTP verified — can buy via escrow. *(Active from Week 2)*
- **TIER_1:** NIN verified — skipped as a standalone gate; NIN is bundled into TIER_2 for store creators.
- **TIER_2:** **BVN + NIN** — required to **CREATE A STORE, sell, receive payouts.** Automatically grants a free, permanent **"BVN Verified" blue checkmark** on the store — proves real identity, no payment required. Buyers only need TIER_0. *(Manual elevation for pilot vendors — Dojah integration added at ~seller #25)*
- **TIER_3 / "DepMi Certified" Badge (Paid):** BVN + NIN + CAC registration. Distinct from the free TIER_2 checkmark. Carries CAC backing, priority dispute resolution, and future algorithm boosts. DepMi assists with CAC filing (see Financial Model). Badge issued on CAC confirmation.
- **BUSINESS:** TIN verified — highest transaction limits. *(Post-MVP)*

> **MVP Strategy (0–500 users):** KYC via Dojah/Smile ID is deferred. Buyers verify with email + phone OTP (TIER_0) only. Pilot sellers are manually elevated to TIER_2 by admin. Dojah BVN + NIN verification added as a feature flag when store creation demand scales (~seller #25+). **Raw NIN/BVN numbers must never be stored — only Dojah reference tokens.**

### E. @DepMiBot (The Onboarding Hack)
- **Workflow:** Vendor tags `@depmibot` on an Instagram/Facebook post.
- **AI Logic:** Bot scans image + caption → extracts Price/Title/Size → creates a draft listing on DepMi.
- **Goal:** Zero manual data entry for busy vendors.

### F. The Demand Engine (Product Requests)
- **Feature:** Buyers post "Looking for [Product] + [Budget] + [Location]".
- **Loop:** Relevant store owners get notified to "Bid" with their listings.
- **Bid→Product Link:** Vendors can attach an existing product from their store when bidding.
- **Order Tracing:** Orders track their origin (Demand + Bid), so the demand→bid→order flow is auditable.

### G. Affiliate & Reshare System
- **Reshare to Earn:** Every user gets a custom affiliate link for any product. If a sale happens through their link, they earn a commission set by the vendor (5–20%, deducted from vendor's profit). Resharing is a paid feature activation for stores — only stores that have enabled it generate commissionable links.
- **Non-Commissioned Shares:** Vendors who opt out of cash commissions still allow sharing; sharers earn **Deps** instead of fiat on successful sales, keeping the incentive alive.
- **Affiliate Profiles:** Users who affiliate with stores earn visible **brand badges** on their public profile (`/u/[username]`). The badge grid is a living portfolio of brand partnerships — visible to all buyers, functioning as passive marketing for those brands. More badges = more influence = more buyer trust.
- **Two Earning Modes:**
  - **Commission** — % of every sale through their affiliate link (vendor sets the rate per product or store-wide).
  - **Fixed Deal** — A store proposes a flat-rate deal to an affiliate (e.g. ₦10,000 to promote for 2 weeks). DepMi takes **10%** of the deal value for facilitating the agreement. Terms and duration are set in-app.
- **Roadmap:** Commission splits ship in Phase 3 (Week 5) alongside Paystack escrow. Fixed influencer deals in Phase 2.

### H. Resell / Internal Dropshipping *(Phase 2.5)*
- **Concept:** Any user can "resell" another store's product on their own DepMi profile or storefront, marking it up above the vendor's original price.
- **Flow:** Buyer pays the reseller's price → payment auto-splits at checkout (vendor gets their original price, reseller keeps the markup, DepMi takes 5% of the total transaction).
- **Minimum Markup Guard:** A minimum **10% markup** is enforced to prevent resellers from listing below or at the original vendor price and undercutting their store.
- **No down payment needed:** Escrow protects all parties. The reseller never holds funds — the split routes correctly at checkout after buyer confirms receipt.
- **Prerequisite:** Requires Phase 3 Paystack split payment infrastructure to be solid and a meaningful product catalog to exist. Targeted for **Phase 2.5**.

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
- **Core Principle:** Free to list — vendors only pay when they sell. This maximises vendor acquisition and avoids subscription friction before users see value.
- **Primary Revenue — Transaction Fee:** **5% per completed order** (deducted via payment splits at checkout). This is the only cost a new vendor ever sees.
- **Secondary Revenue — Featured Listings (Discovery Page):** *(Locked until 10,000 MAU)*
  - ₦800/day · ₦4,000/week · ₦12,000/month (sponsored carousel on Discovery)
  - ₦2,500/week (Category top-spot placement)
  - Clearly labelled "Sponsored" — organic content below is never paid.
  - **Pre-10k MAU:** Discovery carousel is algorithmic only — curated by Dep score to reward high-trust stores and train buyer behaviour. No paid slots until there are enough DAU for vendor ROI to be real. Selling ad placements to a 200-user audience burns vendor trust permanently.
- **Secondary Revenue — Demand Engine Bid Boost:** ₦300–₦500 to pin a vendor's bid response to the top of an open demand request. Impulse-spend; high perceived value.
- **"DepMi Certified" Badge — Subscription (Revocable, CAC-backed):**
  - Monthly: ₦1,500 · 6 Months: ₦8,000 · Annual: ₦15,000
  - Separate from the free TIER_2 "BVN Verified" checkmark. New vendors see the free badge first — the Certified badge is an upgrade once they're already profitable.
  - Renewable. Revocable by DepMi for fraud, unresolved disputes, or verified illegitimacy.
  - Long-term vision: DepMi Certified becomes the African industry trust standard — CAC-backed and linkable on WhatsApp/Instagram/TikTok bio.
- **CAC Registration Assistance (Service Fee):**
  - DepMi partners with a CAC filing service (e.g. Approve.ng, Simplifycac) to offer in-app CAC registration.
  - Business Name: ₦10,000 (official CAC fee) + ₦5,000 (DepMi service fee) = **₦15,000 total**.
  - Private Limited (Ltd): ₦25,000 (official) + ₦10,000 (service fee) = **₦35,000 total**.
  - Vendors with an existing CAC number can enter it directly to skip filing. DepMi confirms and issues the Verified badge.
  - Vendors without CAC are guided through the in-app filing flow. Badge issued on CAC confirmation (2–5 business days).
- **Phase 2 — Fixed Influencer Deals:** Stores and affiliates negotiate flat-rate promotion deals in-app. DepMi takes **10%** of the agreed deal value for facilitating the agreement.
- **Phase 2 — Pro Subscription (Deferred):** Monthly/quarterly/bi-annual/annual plans introduced only after vendors are already profitable on the platform and organically requesting advanced tools (unlimited products, priority bidding, same-day payouts, detailed analytics). Forcing subscriptions before value is proven risks vendor churn and competitor advantage.
- **Wallet Strategy:** No internal holding of funds in Phase 1 (Avoids ₦4B CBN requirement). Funds auto-settle to vendor bank accounts (T+1).
- **Withdrawal Fee:** 0.5% (Introduced in Phase 2 with Partner Wallets).

---

## 5. 6-Week MVP Roadmap
This roadmap focuses on shipping the **Demand Engine** and the **Trust Loop** (Deps) to prove the core concept within 42 days.

### **Phase 1: Identity & Trust (Weeks 1–2)**
*   **W1: Auth & Profiles:** Implement Email/Password + Google OAuth (Account model). User onboarding flow for Google OAuth users. Public User Profiles (`/u/[username]`) with trust visualization (Deps & Tiers). ✅ *Complete.*
*   **W2: Phone OTP & Vendor Invites:** WhatsApp/SMS OTP for phone number verification via `OtpToken` table (TIER_0). Build secure `StoreInvite` flow: Admin generates 48hr unique link → sent to pre-vetted vendor → vendor fills BVN → Dojah verifies ($0.06) → User elevated to TIER_2. Push schema to Neon DB (`npx prisma db push`). Build Deps system (`depCount` + `DepTransaction` audit trail). [/] *In Progress.*

### **Phase 2: Discovery & Demand (Weeks 3–4)**
*   **W3: Stores & Products:** Store creation gated by TIER_2 (BVN + NIN both required). Pilot vendors use admin invite code bypass — Dojah integration added at ~seller #25. Free to list — no subscription on store creation. Vendor listing flow (Photos via ProductImage, Price, Inventory). Public storefronts (`depmi.com/store/[slug]`). User Profile page. Connect Discover feed to real DB data.
    - **Verified Business Badge Flow:** Store settings → "Apply for Verified" → enter existing CAC number OR trigger in-app CAC filing via partner API. Badge issued on confirmation. Subscription billed (₦1,500/mo · ₦8,000/6mo · ₦15,000/yr).
    - **Discovery Page Architecture:** Top section = paid "Featured Today" sponsored carousel (clearly labelled "Sponsored"). Below = organic category browse + trending by location. Home feed remains 100% organic/social — never paid placement.
    - **Navigation Architecture (Final):** 5-tab bottom nav restructured as:
      ```
      Home  |  Discover  |  ➕  |  Demand Engine  |  Profile
      ```
      - **Home** — Social feed: follows, activity, Deps earned. Organic only.
      - **Discover** — Browse products/stores with an embedded search bar at the top. Category filters below.
      - **➕ (Centre, raised)** — Contextual creation sheet (bottom drawer):
        - Always shows: "📣 Post a Demand" (buyer posts what they're looking for)
        - Only shown if user has a store: "📦 Add a Product"
      - **Demand Engine** — Dedicated tab for the demand request feed. Buyers browse open demands; vendors see bidding opportunities. Gets its own permanent tab because it is the core differentiator.
      - **Profile** — Personal account, store switcher, settings.
      - **Search** removed as a standalone tab. Lives in: (a) header top-right icon, (b) embedded search bar within the Discover tab. Both are where users instinctively look for search.
*   **W4: The Demand Engine:** "Product Request" feed. Bid system (vendor attaches product). Search (Meilisearch/Postgres full-text) to match demands to listings. Notifications system (in-app).

### **Phase 3: Transactions & Logistics (Weeks 5–6)**
*   **W5: Secure Payments & Affiliates:** Paystack Split Payments with escrow. Order creation from accepted bids (origin tracing: demandId + bidId). Implement "Reshare to Earn" commission splits for affiliate links.
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
- **Monetisation Gates:** Paid features (Discovery ads, Bid Boost, Certified badge billing) are documented but NOT built until the platform has real users. Build the commerce loop first; add monetisation once there is an audience for it to work on.
- **Documentation:** Always update `logs.md`, `tips.md`, and `agent.md` after every session. See `.agents/workflows/update-docs.md`.
