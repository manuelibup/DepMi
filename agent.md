# DepMi (Buy Here) - Project Blueprint

## Table of Contents
- [1. Core Vision](#1-core-vision)
- [2. Foundational Features](#2-foundational-features) *(A–H)*
- [3. Brand Identity (Tech + Culture)](#3-brand-identity-tech--culture)
- [4. Financial & Regulatory Model (Phase 1)](#4-financial--regulatory-model-phase-1)
- [5. 6-Week MVP Roadmap](#5-6-week-mvp-roadmap)
- [6. Data Architecture (Current Schema)](#6-data-architecture-current-schema)
- [7. Post-MVP Backlog](#7-post-mvp-backlog)
- [8. Development Guidelines](#8-development-guidelines)

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
- **Browse-First Access:** Unauthenticated guests can browse all public content — home feed, store pages, product listings, demand requests, public profiles, and search — without an account. Auth is required only at the action level (buying, bidding, posting demands, viewing personal orders/profile). Enforced via middleware private-route allowlist + `AuthGateProvider` modal (in-page action gates). Implemented in Session 29.

### B. Waitlist Mode (Pre-launch Strategy)
- **Waitlist UI:** High-fidelity landing page with glassmorphism and animated background blobs.
- **Persistence:** Collects and validates email addresses in the `Waitlist` model via `/api/waitlist`.
- **Conditional Toggle:** Site conditionally renders the Waitlist based on the `NEXT_PUBLIC_SHOW_WAITLIST` environment variable.
- **Goal:** Public pre-launch phase to build hype and capture leads while dev continues.
- **Niche Comparison (vs Hustla.live):**
    - **Hustla.live (Directory Model):** Focuses on list-and-find. The buyer has to search through thousands of vendors. High friction for buyers, low conversion for new sellers.
    - **DepMi (Demand Engine Model):** Focuses on "Demand-First." Buyers post what they need; the platform alerts vendors. Zero friction for buyers, guaranteed high-intent leads for sellers. This is the core differentiator that makes DepMi a social commerce *engine* rather than just a directory.

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
- **TIER_0:** Phone OTP verified — can buy via escrow. Transaction limits apply (see below). *(Active from Week 2)*
- **TIER_1:** NIN verified — skipped as a standalone gate; NIN is bundled into TIER_2 for store creators.
- **TIER_2 (Identity Verified):** **BVN + NIN** — required to **CREATE A STORE, sell, receive payouts.** Proves real identity, no payment required. Vendors are buyer-side exempt from spending limits. *(Manual elevation for pilot vendors — Dojah integration added at ~seller #25)*
- **Blue Badge (High Deps / Organic Trust):** Awarded automatically to users/stores that achieve high Dep scores (e.g., > 150 Deps) through transaction volume and flawless escrow history. Represents community credibility ("aura farming"). High Dep scores directly boost algorithmic discovery.
- **Gold Badge / "DepMi Certified" (Paid CAC):** BVN + NIN + CAC registration. The premium business tier. Carries full CAC backing, priority dispute resolution, and future pro perks. DepMi assists with CAC filing. Badge issued on CAC confirmation.

#### Buyer Transaction Limits by Tier
| Tier | Max per transaction | Cumulative cap | Reset |
|------|-------------------|---------------|-------|
| TIER_0 (phone only) | ₦50,000 | ₦200,000 | Rolling 30-day window |
| TIER_1 / TIER_2 | ₦500,000 | No cap | — |

- **Soft nudge at ₦150,000 cumulative:** Banner prompts user to verify (non-blocking).
- **Hard block at ₦200,000:** Modal with single CTA — "Verify now to continue". No bypass.
- **NIN help text in UI:** "Don't have your NIN? Dial *346# on your MTN line."
- **Vendor side:** Verification (TIER_2) is **mandatory before creating a store or accepting any payment**. No unverified selling — no exceptions.

> **MVP Strategy (0–500 users):** KYC via Dojah/Smile ID is deferred. Buyers verify with phone OTP (TIER_0) only and operate within the ₦50k/₦200k rolling limits. Pilot sellers are manually elevated to TIER_2 by admin. Dojah BVN + NIN verification added as a feature flag when store creation demand scales (~seller #25+). **Raw NIN/BVN numbers must never be stored — only Dojah reference tokens.**

### E. @DepMiBot (The Onboarding Hack)
- **Workflow:** Vendor tags `@depmibot` on an Instagram/Facebook post.
- **AI Logic:** Bot scans image + caption → extracts Price/Title/Size → creates a draft listing on DepMi.
- **Goal:** Zero manual data entry for busy vendors.

### F. The Demand Engine (Product Requests)
- **Feature:** Buyers post "Looking for [Product] + [Budget] + [Location]".
- **Loop:** Relevant store owners get notified to "Bid" with their listings.
- **Bid→Product Link:** Vendors can attach an existing product from their store when bidding.
- **Order Tracing:** Orders track their origin (Demand + Bid), so the demand→bid→order flow is auditable.
- **"Request This Product" button:** Surfaces on `/search` when a query returns 0 DepMi results. One tap → pre-fills a Demand post with the search query. This is the primary UI entry point into the Demand Engine for buyers.
- **"Notify Me When Available":** Shown on (a) empty search results and (b) out-of-stock product cards. Creates a `ProductWatch` record. When a matching product is listed or restocked, DepMi notifies the user via SMS (Termii) or email (Resend). Phase 2: UI + DB record. Phase 3: notification delivery.

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
- **Phase 2 — Pro Subscription (Deferred):** Monthly/quarterly/bi-annual/annual plans introduced only after vendors are already profitable on the platform and organically requesting advanced tools (unlimited products, priority bidding, same-day payouts, detailed analytics, **scheduled AI catalog re-sync**). Forcing subscriptions before value is proven risks vendor churn and competitor advantage. The AI catalog import is free for initial onboarding (up to 500 products) — the recurring sync is the Pro hook, not the first import.
- **Phase 3 — Crypto-Fiat Payment Rails:** A core long-term vision to facilitate borderless African commerce. Integration of web3 payment processors to support seamless crypto-to-fiat, fiat-to-fiat, and fiat-to-crypto checkout flows, bypassing traditional FX friction and allowing buyers to use crypto while vendors settle natively.
- **Wallet Strategy:** No internal holding of funds in Phase 1 (Avoids ₦4B CBN requirement). Funds auto-settle to vendor bank accounts (T+1).
- **Withdrawal Fee:** 0.5% (Introduced in Phase 2 with Partner Wallets).

---

## 5. 6-Week MVP Roadmap
This roadmap focuses on shipping the **Demand Engine** and the **Trust Loop** (Deps) to prove the core concept within 42 days.

### **Phase 1: Identity & Trust (Weeks 1–2)**
*   **W1: Auth & Profiles:** Implement Email/Password + Google OAuth (Account model). User onboarding flow for Google OAuth users. Public User Profiles (`/u/[username]`) with trust visualization (Deps & Tiers). Add shipping/delivery `address` to `User` profiles to reduce future checkout friction. ✅ *Complete.*
*   **W2: Phone OTP & Vendor Invites:** WhatsApp/SMS OTP for phone number verification via `OtpToken` table (TIER_0). Build secure `StoreInvite` flow: Admin generates 48hr unique link → sent to pre-vetted vendor → vendor fills BVN → Dojah verifies ($0.06) → User elevated to TIER_2. Push schema to Neon DB (`npx prisma db push`). Build Deps system (`depCount` + `DepTransaction` audit trail). [/] *In Progress.*

### **Phase 2: Discovery & Demand (Weeks 3–4)**
*   **W3: Stores & Products:** Store creation gated by TIER_2 (BVN + NIN both required). Pilot vendors use admin invite code bypass — Dojah integration added at ~seller #25. Free to list — no subscription on store creation. Vendor listing flow (Photos via ProductImage, Price, Inventory). Public storefronts (`depmi.com/store/[slug]`). User Profile page. Connect Discover feed to real DB data.
    - **Portfolio Mode:** Support for showcasing previous work/inventory using the `isPortfolioItem` flag on products. This allows service providers (artists, bespoke tailors) to use DepMi as a living portfolio to build trust, even if the item isn't immediately for sale.
    - **Product Categories / Taxonomy:** Required for search filtering, Demand Engine matching, and ProductWatch. Define a fixed top-level category list at launch (e.g. Fashion, Electronics, Food, Beauty, Home, Services). Products and Demands must have a category field.
    - **Search Implementation:** Postgres full-text search (`tsvector` on Product title + description + Store name). No external search service needed at MVP. Extend to Meilisearch/Typesense post-MVP if latency becomes an issue.
    - **Search UX — empty state:** If query returns 0 results, show: (1) "Request This Product" button → pre-fills a Demand post; (2) "Notify Me When Available" toggle → creates a `ProductWatch` record.
    - **Wish Lists / Saved Items:** Leverage the `ProductWatch` blueprint to allow buyers to simply save items they are interested in without complicating checkout flow.
    - **Store Public Profile Page (`/store/[slug]`):** Store bio, Dep score badge, product grid, ratings summary, social links, "Follow" button.
    - **Verified Business Badge Flow:** Store settings → "Apply for Verified" → enter existing CAC number OR trigger in-app CAC filing via partner API. Badge issued on confirmation. Subscription billed (₦1,500/mo · ₦8,000/6mo · ₦15,000/yr).
    - **Media Infrastructure (Cloudinary):** All product images and videos hosted on Cloudinary CDN. Direct browser-to-CDN upload via signed tokens from `GET /api/upload/sign` — server never handles file bytes. Auto-compression via `q_auto` at delivery. Video limits: **100MB max file size, 60 seconds max duration** (enforced client-side before upload). DB stores clean Cloudinary URLs; originals preserved; watermarked URLs delivered to clients.
    - **Vendor Catalog Import — Three Paths:**
      1. **Single product form** — Mobile-first. One product at a time. Category icon grid (not a dropdown), ₦-prefixed price field, camera tap for photos. <5 minutes per product.
      2. **CSV bulk import** — Vendor uploads any spreadsheet export. DepMi validates rows, shows preview ("204 valid · 3 errors"), vendor confirms → atomic batch insert. Free. Template available for download.
      3. **AI-powered import (Claude Haiku)** — Accepts ANY format: Excel, PDF, photo of handwritten price list, WhatsApp catalog screenshot. AI parses to DepMi product schema, vendor reviews preview table, confirms. **Free for initial onboarding (up to 500 products). Scheduled re-sync is a Pro feature.** API cost ~₦30 per 300-product import — negligible. Prompt-injection hardened server-side.
    - **ISBN Auto-Fill (Book Vendors):** Vendor enters ISBN → Open Library API → Google Books API fallback → if both fail, manual entry with photo upload. Cover image auto-populated. Failed lookups contribute to DepMi's own African book catalog for future vendors.
    - **Batch Import Security:** 10MB file size cap; MIME type whitelist (CSV/Excel only); CSV injection sanitization (strip leading `=`, `+`, `-`, `@`); row-level Zod validation with error report; atomic Prisma `$transaction` (all-or-nothing); rate limit (1 bulk import per store per 10 minutes); imports >500 rows run as background jobs with `/api/catalog/import-status/[jobId]` polling.
    - **Discovery Page Architecture:** Top section = paid "Featured Today" sponsored carousel (clearly labelled "Sponsored"). Below = organic category browse + trending by location. Home feed remains 100% organic/social — never paid placement.
    - **Navigation Architecture (FINAL — do not change):** 5-tab bottom nav:
      ```
      Home  |  Requests  |  ➕  |  Orders  |  Profile
      ```
      - **Home** (`/`) — Combined product/demand/store feed. MVP: all content by recency + Dep score. Phase 2: follows-only with algorithmic surfacing for new users.
      - **Requests** (`/requests`) — The Demand Engine. Buyers browse open product requests; vendors see bidding opportunities.
      - **➕ (Centre, raised)** — Smart routing:
        - **Buyer (no store):** Opens bottom sheet: "📣 Post a Request" and "📦 Open a Store" → `/store/create`.
        - **Store owner:** Opens bottom sheet: "📣 Post a Request" and "📦 Add a Product" → `/store/[slug]/products/new`.
        - **Unauthenticated:** Shows auth gate modal (never hard redirect to `/login`).
      - **Orders** (`/orders`) — Dedicated order tracking + active bids. High-anxiety post-purchase = deserves its own tab. Never buried in Profile.
      - **Profile** (`/profile`) — Account, store switcher, settings.
      - **🔍 Search** — Global header icon (top-right) present on **every screen**. Opens `/search` with keyboard immediately focused + shows "Trending" and "Popular Near You" before typing. Not a bottom nav tab — universal header pattern (YouTube/Instagram/Twitter model).
*   **W4: The Demand Engine:** "Product Request" feed. Bid system (vendor attaches product). Postgres full-text search to match demands to listings. `ProductWatch` DB records for "Notify Me" (UI + DB only — delivery in Phase 3). In-app notification system.

### **Phase 3: Transactions & Logistics (Weeks 5–6)**
*   **W5: Secure Payments & Affiliates:** Paystack Split Payments with escrow. Order creation from accepted bids (origin tracing: demandId + bidId). Implement "Reshare to Earn" commission splits for affiliate links.
    - **KYC Limit Enforcement at Checkout:** Before processing any payment, check `session.user.kycTier` and sum of transactions in the last 30 days (`cumulativeSpend`). Block if TIER_0 and (single tx > ₦50,000 OR rolling total > ₦200,000). On block: show modal → verification flow. On success: record transaction and update rolling spend.
    - **Verification Upgrade UX:** Soft nudge banner at ₦150,000 rolling spend. Hard modal block at ₦200,000 with single CTA: "Verify to continue" (NIN/BVN flow).
*   **W6: The Loop:** Order status tracking + "Confirm Receipt" triggers payout + Deps.
    - **Order State Machine (COMPLETE — do not simplify):**
      `PENDING → CONFIRMED → SHIPPED → DELIVERED → COMPLETED`
      Failure paths: `→ CANCELLED` (before SHIPPED), `→ DISPUTED` (buyer raises issue), `→ RESOLVED_BUYER | RESOLVED_VENDOR` (admin arbitration), `→ REFUNDED`
    - **Dispute Resolution:**
      - Vendor has **48 hours** after order is CONFIRMED to mark as SHIPPED (update tracking). If not done, buyer can raise a dispute.
      - Buyer can raise a dispute within **7 days** of delivery confirmation.
      - MVP: DepMi admin resolves manually via admin panel. Post-MVP: automated rules.
      - Escrow states: `HELD → RELEASING → RELEASED` (happy path) | `HELD → DISPUTED → RESOLVED_BUYER | RESOLVED_VENDOR`
    - **Vendor Payout Schedule:** Funds release T+3 days after buyer confirms delivery (COMPLETED status). Auto-confirm after 7 days of no dispute if buyer does not confirm. Payout via Paystack Transfer API to vendor's registered bank account.
    - **Refund Flow:** REFUNDED status = auto-refund to buyer's original payment method within 5 business days. Triggered by RESOLVED_BUYER outcome or CANCELLED before shipment.
    - **Review & Rating System:** Post-delivery (COMPLETED status), buyer is prompted to rate vendor 1–5 stars + optional text review. Rating feeds into Store's Dep score calculation. One review per order.
    - **ProductWatch Notification Delivery:** Cron job (or listing webhook): when a new Product is published, match its category + keywords against open `ProductWatch` records. Notify matched users via Termii SMS (primary) or Resend email (fallback). Mark `ProductWatch.notified = true`.
    - **Push Notification Hierarchy (all 3 channels):** In-app first → SMS (Termii) for high-priority events → email (Resend) for transactional receipts. Never fire all 3 for the same event.
    - **Notification System (10 event types):** BID_RECEIVED, BID_ACCEPTED, ORDER_PLACED, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, PAYMENT_RELEASED, DISPUTE_OPENED, DISPUTE_RESOLVED, PRODUCT_AVAILABLE (ProductWatch).
    - **Launch Pilot** with first 20 vendors.

### **Phase 4: Social Connectivity (Week 7)** ✅ *Complete.*
*   **W7: Interactions & Retention:** Establish the social feedback loops that drive daily active usage (DAU).
    - **Direct Messaging (DMs):** Real-time buyer-to-vendor communication (`/messages`). Polling-based or WebSocket chat interface with optimistic UI updates.
    - **Comment Engine:** Contextual comments on Demand Requests and Products (`/api/products/[id]/comments`). Include `@mentions` parsing that translates to clickable profile links and triggers push notifications.
    - **Interactive Notifications Feed:** A dedicated `/notifications` tab that consolidates all `MENTION`, `ORDER_UPDATE`, and system alerts.
    - **Share Sheet UX:** A unified, cross-platform custom share menu replacing native browser capabilities to ensure a consistent referral experience across WhatsApp, X, and Facebook.
    - **Responsive Desktop Architecture:** Prevent the "stretched mobile app" look. Enforce strict max-width constraints (e.g., `maxWidth: 600px`) on desktop views for central feed, product details, and checkout to ensure premium aesthetics on all monitor sizes.

---

## 6. Data Architecture (Current Schema)
- **User** — Personal identity, auth, buying, trust (buyer Deps). Includes `kycTier` enum, `cumulativeSpend` (Int, tracks rolling 30-day spend for TIER_0 limit enforcement), and shipping fields (`address`, `city`, `state`) to reduce checkout friction.
- **Account** — Multi-provider auth records (Email/Google/WhatsApp).
- **KycStatus** — Tiered verification (stores Smile ID/Dojah reference tokens only).
- **Store** — Business identity (like Facebook Pages). Owned by User. Has its own Dep score. Includes `rating` (Float) and `reviewCount` (Int).
- **Media Storage (Cloudinary):** All product images, store banners/logos, and user avatars hosted on Cloudinary CDN. DB stores clean Cloudinary URLs only — never raw file bytes. Originals stored without watermark; watermarked transformation URLs delivered to all clients. Video originals stored; `q_auto` compressed on delivery.
- **Product + ProductImage** — Catalog with multi-image carousel support. Includes `category`, `inStock`, `isPortfolioItem`, `videoUrl`, `viewCount`, and `slug` (String? @unique — URL-safe identifier e.g. `dell-xps-15-techstore`, auto-generated from title + store name on create, nullable for backward compat with existing UUID routes).
- **ProductLike** — `{ id, userId, productId, createdAt }`. Database-persisted likes for algorithmic feed tuning and social proof.
- **SavedProduct** — `{ id, userId, productId, createdAt }`. The "Wish List" feature for buyers.
- **ProductWatch** — `{ id, userId, searchQuery?, productId?, createdAt, notified }`. Created when buyer taps "Notify Me When Available".
- **Demand + Bid** — Demand Engine: buyer requests, vendor bids (can attach Product). Demand includes `category` field.
- **Comment** — `{ id, text, authorId, productId?, demandId?, createdAt, updatedAt }`. Belongs to either a Product OR a Demand (nullable FK). KYC-gated (UNVERIFIED users cannot comment). Text limit 500 chars. Supports inline product mentions via `[Title](/p/id)` syntax rendered as green chip links.
- **Order + OrderItem** — Escrow orders with origin tracing (Demand → Bid → Order). Order has `status` enum: `PENDING | CONFIRMED | SHIPPED | DELIVERED | COMPLETED | CANCELLED | DISPUTED | RESOLVED_BUYER | RESOLVED_VENDOR | REFUNDED`. Includes `escrowStatus` enum: `HELD | RELEASING | RELEASED`.
- **Review** — `{ id, orderId, buyerId, storeId, rating (1–5), text?, createdAt }`. One per completed order.
- **StoreFollow** — `{ id, userId, storeId, notify (bool), createdAt, updatedAt }`. Tracks store follows + per-follow notification toggle ("Bell" icon). `@@unique([userId, storeId])`.
- **Conversation** — `{ id, participants (User[]), messages, lastMessageAt, lastMessagePreview, createdAt, updatedAt }`. Many-to-many with User via implicit join.
- **Message** — `{ id, conversationId, senderId, text?, type, mediaUrl?, read, createdAt }`. Supports multi-media: TEXT, IMAGE, AUDIO, STICKER.# DepMi (Buy Here) - Project Blueprint

## Table of Contents
- [1. Core Vision](#1-core-vision)
- [2. Foundational Features](#2-foundational-features) *(A–H)*
- [3. Brand Identity (Tech + Culture)](#3-brand-identity-tech--culture)
- [4. Financial & Regulatory Model (Phase 1)](#4-financial--regulatory-model-phase-1)
- [5. 6-Week MVP Roadmap](#5-6-week-mvp-roadmap)
- [6. Data Architecture (Current Schema)](#6-data-architecture-current-schema)
- [7. Post-MVP Backlog](#7-post-mvp-backlog)
- [8. Development Guidelines](#8-development-guidelines)

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
- **Browse-First Access:** Unauthenticated guests can browse all public content — home feed, store pages, product listings, demand requests, public profiles, and search — without an account. Auth is required only at the action level (buying, bidding, posting demands, viewing personal orders/profile). Enforced via middleware private-route allowlist + `AuthGateProvider` modal (in-page action gates). Implemented in Session 29.

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
- **TIER_0:** Phone OTP verified — can buy via escrow. Transaction limits apply (see below). *(Active from Week 2)*
- **TIER_1:** NIN verified — skipped as a standalone gate; NIN is bundled into TIER_2 for store creators.
- **TIER_2 (Identity Verified):** **BVN + NIN** — required to **CREATE A STORE, sell, receive payouts.** Proves real identity, no payment required. Vendors are buyer-side exempt from spending limits. *(Manual elevation for pilot vendors — Dojah integration added at ~seller #25)*
- **Blue Badge (High Deps / Organic Trust):** Awarded automatically to users/stores that achieve high Dep scores (e.g., > 150 Deps) through transaction volume and flawless escrow history. Represents community credibility ("aura farming"). High Dep scores directly boost algorithmic discovery.
- **Gold Badge / "DepMi Certified" (Paid CAC):** BVN + NIN + CAC registration. The premium business tier. Carries full CAC backing, priority dispute resolution, and future pro perks. DepMi assists with CAC filing. Badge issued on CAC confirmation.

#### Buyer Transaction Limits by Tier
| Tier | Max per transaction | Cumulative cap | Reset |
|------|-------------------|---------------|-------|
| TIER_0 (phone only) | ₦50,000 | ₦200,000 | Rolling 30-day window |
| TIER_1 / TIER_2 | ₦500,000 | No cap | — |

- **Soft nudge at ₦150,000 cumulative:** Banner prompts user to verify (non-blocking).
- **Hard block at ₦200,000:** Modal with single CTA — "Verify now to continue". No bypass.
- **NIN help text in UI:** "Don't have your NIN? Dial *346# on your MTN line."
- **Vendor side:** Verification (TIER_2) is **mandatory before creating a store or accepting any payment**. No unverified selling — no exceptions.

> **MVP Strategy (0–500 users):** KYC via Dojah/Smile ID is deferred. Buyers verify with phone OTP (TIER_0) only and operate within the ₦50k/₦200k rolling limits. Pilot sellers are manually elevated to TIER_2 by admin. Dojah BVN + NIN verification added as a feature flag when store creation demand scales (~seller #25+). **Raw NIN/BVN numbers must never be stored — only Dojah reference tokens.**

### E. @DepMiBot (The Onboarding Hack)
- **Workflow:** Vendor tags `@depmibot` on an Instagram/Facebook post.
- **AI Logic:** Bot scans image + caption → extracts Price/Title/Size → creates a draft listing on DepMi.
- **Goal:** Zero manual data entry for busy vendors.

### F. The Demand Engine (Product Requests)
- **Feature:** Buyers post "Looking for [Product] + [Budget] + [Location]".
- **Loop:** Relevant store owners get notified to "Bid" with their listings.
- **Bid→Product Link:** Vendors can attach an existing product from their store when bidding.
- **Order Tracing:** Orders track their origin (Demand + Bid), so the demand→bid→order flow is auditable.
- **"Request This Product" button:** Surfaces on `/search` when a query returns 0 DepMi results. One tap → pre-fills a Demand post with the search query. This is the primary UI entry point into the Demand Engine for buyers.
- **"Notify Me When Available":** Shown on (a) empty search results and (b) out-of-stock product cards. Creates a `ProductWatch` record. When a matching product is listed or restocked, DepMi notifies the user via SMS (Termii) or email (Resend). Phase 2: UI + DB record. Phase 3: notification delivery.

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
- **Phase 2 — Pro Subscription (Deferred):** Monthly/quarterly/bi-annual/annual plans introduced only after vendors are already profitable on the platform and organically requesting advanced tools (unlimited products, priority bidding, same-day payouts, detailed analytics, **scheduled AI catalog re-sync**). Forcing subscriptions before value is proven risks vendor churn and competitor advantage. The AI catalog import is free for initial onboarding (up to 500 products) — the recurring sync is the Pro hook, not the first import.
- **Phase 3 — Crypto-Fiat Payment Rails:** A core long-term vision to facilitate borderless African commerce. Integration of web3 payment processors to support seamless crypto-to-fiat, fiat-to-fiat, and fiat-to-crypto checkout flows, bypassing traditional FX friction and allowing buyers to use crypto while vendors settle natively.
- **Wallet Strategy:** No internal holding of funds in Phase 1 (Avoids ₦4B CBN requirement). Funds auto-settle to vendor bank accounts (T+1).
- **Withdrawal Fee:** 0.5% (Introduced in Phase 2 with Partner Wallets).

---

## 5. 6-Week MVP Roadmap
This roadmap focuses on shipping the **Demand Engine** and the **Trust Loop** (Deps) to prove the core concept within 42 days.

### **Phase 1: Identity & Trust (Weeks 1–2)**
*   **W1: Auth & Profiles:** Implement Email/Password + Google OAuth (Account model). User onboarding flow for Google OAuth users. Public User Profiles (`/u/[username]`) with trust visualization (Deps & Tiers). Add shipping/delivery `address` to `User` profiles to reduce future checkout friction. ✅ *Complete.*
*   **W2: Phone OTP & Vendor Invites:** WhatsApp/SMS OTP for phone number verification via `OtpToken` table (TIER_0). Build secure `StoreInvite` flow: Admin generates 48hr unique link → sent to pre-vetted vendor → vendor fills BVN → Dojah verifies ($0.06) → User elevated to TIER_2. Push schema to Neon DB (`npx prisma db push`). Build Deps system (`depCount` + `DepTransaction` audit trail). [/] *In Progress.*
*   **Admin 3-Layer Security:** All admin dashboards (`/admin/*`) require standard identity login, followed by Google Authenticator (TOTP) 2FA verification, and a tertiary static `adminPin` challenge. Enforced via NextAuth callbacks fetching flags to redirect to the `/secure-admin` gateway for initialization.

### **Phase 2: Discovery & Demand (Weeks 3–4)**
*   **W3: Stores & Products:** Store creation gated by TIER_2 (BVN + NIN both required). Pilot vendors use admin invite code bypass — Dojah integration added at ~seller #25. Free to list — no subscription on store creation. Vendor listing flow (Photos via ProductImage, Price, Inventory). Public storefronts (`depmi.com/store/[slug]`). User Profile page. Connect Discover feed to real DB data.
    - **Portfolio Mode:** Support for showcasing previous work/inventory using the `isPortfolioItem` flag on products. This allows service providers (artists, bespoke tailors) to use DepMi as a living portfolio to build trust, even if the item isn't immediately for sale.
    - **Product Categories / Taxonomy:** Required for search filtering, Demand Engine matching, and ProductWatch. Define a fixed top-level category list at launch (e.g. Fashion, Electronics, Food, Beauty, Home, Services). Products and Demands must have a category field.
    - **Search Implementation:** Postgres full-text search (`tsvector` on Product title + description + Store name). No external search service needed at MVP. Extend to Meilisearch/Typesense post-MVP if latency becomes an issue.
    - **Search UX — empty state:** If query returns 0 results, show: (1) "Request This Product" button → pre-fills a Demand post; (2) "Notify Me When Available" toggle → creates a `ProductWatch` record.
    - **Wish Lists / Saved Items:** Leverage the `ProductWatch` blueprint to allow buyers to simply save items they are interested in without complicating checkout flow.
    - **Store Public Profile Page (`/store/[slug]`):** Store bio, Dep score badge, product grid, ratings summary, social links, "Follow" button.
    - **Verified Business Badge Flow:** Store settings → "Apply for Verified" → enter existing CAC number OR trigger in-app CAC filing via partner API. Badge issued on confirmation. Subscription billed (₦1,500/mo · ₦8,000/6mo · ₦15,000/yr).
    - **Media Infrastructure (Cloudinary):** All product images and videos hosted on Cloudinary CDN. Direct browser-to-CDN upload via signed tokens from `GET /api/upload/sign` — server never handles file bytes. Auto-compression via `q_auto` at delivery. Video limits: **100MB max file size, 60 seconds max duration** (enforced client-side before upload). DB stores clean Cloudinary URLs; originals preserved; watermarked URLs delivered to clients.
    - **Vendor Catalog Import — Three Paths:**
      1. **Single product form** — Mobile-first. One product at a time. Category icon grid (not a dropdown), ₦-prefixed price field, camera tap for photos. <5 minutes per product.
      2. **CSV bulk import** — Vendor uploads any spreadsheet export. DepMi validates rows, shows preview ("204 valid · 3 errors"), vendor confirms → atomic batch insert. Free. Template available for download.
      3. **AI-powered import (Claude Haiku)** — Accepts ANY format: Excel, PDF, photo of handwritten price list, WhatsApp catalog screenshot. AI parses to DepMi product schema, vendor reviews preview table, confirms. **Free for initial onboarding (up to 500 products). Scheduled re-sync is a Pro feature.** API cost ~₦30 per 300-product import — negligible. Prompt-injection hardened server-side.
    - **ISBN Auto-Fill (Book Vendors):** Vendor enters ISBN → Open Library API → Google Books API fallback → if both fail, manual entry with photo upload. Cover image auto-populated. Failed lookups contribute to DepMi's own African book catalog for future vendors.
    - **Batch Import Security:** 10MB file size cap; MIME type whitelist (CSV/Excel only); CSV injection sanitization (strip leading `=`, `+`, `-`, `@`); row-level Zod validation with error report; atomic Prisma `$transaction` (all-or-nothing); rate limit (1 bulk import per store per 10 minutes); imports >500 rows run as background jobs with `/api/catalog/import-status/[jobId]` polling.
    - **Discovery Page Architecture:** Top section = paid "Featured Today" sponsored carousel (clearly labelled "Sponsored"). Below = organic category browse + trending by location. Home feed remains 100% organic/social — never paid placement.
    - **Navigation Architecture (FINAL — do not change):** 5-tab bottom nav:
      ```
      Home  |  Requests  |  ➕  |  Orders  |  Profile
      ```
      - **Home** (`/`) — Combined product/demand/store feed. MVP: all content by recency + Dep score. Phase 2: follows-only with algorithmic surfacing for new users.
      - **Requests** (`/requests`) — The Demand Engine. Buyers browse open product requests; vendors see bidding opportunities.
      - **➕ (Centre, raised)** — Smart routing:
        - **Buyer (no store):** Opens bottom sheet: "📣 Post a Request" and "📦 Open a Store" → `/store/create`.
        - **Store owner:** Opens bottom sheet: "📣 Post a Request" and "📦 Add a Product" → `/store/[slug]/products/new`.
        - **Unauthenticated:** Shows auth gate modal (never hard redirect to `/login`).
      - **Orders** (`/orders`) — Dedicated order tracking + active bids. High-anxiety post-purchase = deserves its own tab. Never buried in Profile.
      - **Profile** (`/profile`) — Account, store switcher, settings.
      - **🔍 Search** — Global header icon (top-right) present on **every screen**. Opens `/search` with keyboard immediately focused + shows "Trending" and "Popular Near You" before typing. Not a bottom nav tab — universal header pattern (YouTube/Instagram/Twitter model).
*   **W4: The Demand Engine:** "Product Request" feed. Bid system (vendor attaches product). Postgres full-text search to match demands to listings. `ProductWatch` DB records for "Notify Me" (UI + DB only — delivery in Phase 3). In-app notification system.

### **Phase 3: Transactions & Logistics (Weeks 5–6)**
*   **W5: Secure Payments & Affiliates:** Paystack Split Payments with escrow. Order creation from accepted bids (origin tracing: demandId + bidId). Implement "Reshare to Earn" commission splits for affiliate links.
    - **KYC Limit Enforcement at Checkout:** Before processing any payment, check `session.user.kycTier` and sum of transactions in the last 30 days (`cumulativeSpend`). Block if TIER_0 and (single tx > ₦50,000 OR rolling total > ₦200,000). On block: show modal → verification flow. On success: record transaction and update rolling spend.
    - **Verification Upgrade UX:** Soft nudge banner at ₦150,000 rolling spend. Hard modal block at ₦200,000 with single CTA: "Verify to continue" (NIN/BVN flow).
*   **W6: The Loop:** Order status tracking + "Confirm Receipt" triggers payout + Deps.
    - **Order State Machine (COMPLETE — do not simplify):**
      `PENDING → CONFIRMED → SHIPPED → DELIVERED → COMPLETED`
      Failure paths: `→ CANCELLED` (before SHIPPED), `→ DISPUTED` (buyer raises issue), `→ RESOLVED_BUYER | RESOLVED_VENDOR` (admin arbitration), `→ REFUNDED`
    - **Dispute Resolution:**
      - Vendor has **48 hours** after order is CONFIRMED to mark as SHIPPED (update tracking). If not done, buyer can raise a dispute.
      - Buyer can raise a dispute within **7 days** of delivery confirmation.
      - MVP: DepMi admin resolves manually via admin panel. Post-MVP: automated rules.
      - Escrow states: `HELD → RELEASING → RELEASED` (happy path) | `HELD → DISPUTED → RESOLVED_BUYER | RESOLVED_VENDOR`
    - **Vendor Payout Schedule:** Funds release T+3 days after buyer confirms delivery (COMPLETED status). Auto-confirm after 7 days of no dispute if buyer does not confirm. Payout via Paystack Transfer API to vendor's registered bank account.
    - **Refund Flow:** REFUNDED status = auto-refund to buyer's original payment method within 5 business days. Triggered by RESOLVED_BUYER outcome or CANCELLED before shipment.
    - **Review & Rating System:** Post-delivery (COMPLETED status), buyer is prompted to rate vendor 1–5 stars + optional text review. Rating feeds into Store's Dep score calculation. One review per order.
    - **ProductWatch Notification Delivery:** Cron job (or listing webhook): when a new Product is published, match its category + keywords against open `ProductWatch` records. Notify matched users via Termii SMS (primary) or Resend email (fallback). Mark `ProductWatch.notified = true`.
    - **Push Notification Hierarchy (all 3 channels):** In-app first → SMS (Termii) for high-priority events → email (Resend) for transactional receipts. Never fire all 3 for the same event.
    - **Notification System (10 event types):** BID_RECEIVED, BID_ACCEPTED, ORDER_PLACED, ORDER_CONFIRMED, ORDER_SHIPPED, ORDER_DELIVERED, PAYMENT_RELEASED, DISPUTE_OPENED, DISPUTE_RESOLVED, PRODUCT_AVAILABLE (ProductWatch).
    - **Launch Pilot** with first 20 vendors.

### **Phase 4: Social Connectivity (Week 7)**
*   **W7: Interactions & Retention:** Establish the social feedback loops that drive daily active usage (DAU).
    - **Direct Messaging (DMs):** Real-time buyer-to-vendor communication (`/messages`). Polling-based or WebSocket chat interface with optimistic UI updates.
    - **Comment Engine:** Contextual comments on Demand Requests and Products (`/api/products/[id]/comments`). Include `@mentions` parsing that translates to clickable profile links and triggers push notifications.
    - **Interactive Notifications Feed:** A dedicated `/notifications` tab that consolidates all `MENTION`, `ORDER_UPDATE`, and system alerts.
    - **Share Sheet UX:** A unified, cross-platform custom share menu replacing native browser capabilities to ensure a consistent referral experience across WhatsApp, X, and Facebook.
    - **Responsive Desktop Architecture:** Prevent the "stretched mobile app" look. Enforce strict max-width constraints (e.g., `maxWidth: 600px`) on desktop views for central feed, product details, and checkout to ensure premium aesthetics on all monitor sizes.

---

## 6. Data Architecture (Current Schema)
- **User** — Personal identity, auth, buying, trust (buyer Deps). Includes `kycTier` enum, `cumulativeSpend` (Int, tracks rolling 30-day spend for TIER_0 limit enforcement), and shipping fields (`address`, `city`, `state`) to reduce checkout friction.
- **Account** — Multi-provider auth records (Email/Google/WhatsApp).
- **KycStatus** — Tiered verification (stores Smile ID/Dojah reference tokens only).
- **Store** — Business identity (like Facebook Pages). Owned by User. Has its own Dep score. Includes `rating` (Float) and `reviewCount` (Int).
- **Media Storage (Cloudinary):** All product images, store banners/logos, and user avatars hosted on Cloudinary CDN. DB stores clean Cloudinary URLs only — never raw file bytes. Originals stored without watermark; watermarked transformation URLs delivered to all clients. Video originals stored; `q_auto` compressed on delivery.
- **Product + ProductImage** — Catalog with multi-image carousel support. Includes `category`, `inStock`, `isPortfolioItem`, `videoUrl`, `viewCount`, and `slug` (String? @unique — URL-safe identifier e.g. `dell-xps-15-techstore`, auto-generated from title + store name on create, nullable for backward compat with existing UUID routes).
- **ProductLike** — `{ id, userId, productId, createdAt }`. Database-persisted likes for algorithmic feed tuning and social proof.
- **SavedProduct** — `{ id, userId, productId, createdAt }`. The "Wish List" feature for buyers.
- **ProductWatch** — `{ id, userId, searchQuery?, productId?, createdAt, notified }`. Created when buyer taps "Notify Me When Available".
- **Demand + Bid** — Demand Engine: buyer requests, vendor bids (can attach Product). Demand includes `category` field.
- **Comment** — `{ id, text, authorId, productId?, demandId?, createdAt, updatedAt }`. Belongs to either a Product OR a Demand (nullable FK). KYC-gated (UNVERIFIED users cannot comment). Text limit 500 chars. Supports inline product mentions via `[Title](/p/id)` syntax rendered as green chip links.
- **Order + OrderItem** — Escrow orders with origin tracing (Demand → Bid → Order). Order has `status` enum: `PENDING | CONFIRMED | SHIPPED | DELIVERED | COMPLETED | CANCELLED | DISPUTED | RESOLVED_BUYER | RESOLVED_VENDOR | REFUNDED`. Includes `escrowStatus` enum: `HELD | RELEASING | RELEASED`.
- **Review** — `{ id, orderId, buyerId, storeId, rating (1–5), text?, createdAt }`. One per completed order.
- **StoreFollow** — `{ id, userId, storeId, notify (bool), createdAt, updatedAt }`. Tracks store follows + per-follow notification toggle ("Bell" icon). `@@unique([userId, storeId])`.
- **Conversation** — `{ id, participants (User[]), messages, lastMessageAt, lastMessagePreview, createdAt, updatedAt }`. Many-to-many with User via implicit join.
- **Message** — `{ id, conversationId, senderId, text?, type (MessageType), mediaUrl?, read, createdAt }`. `MessageType` enum: `TEXT | IMAGE | AUDIO | STICKER`.
- **DepTransaction** — Audit trail for trust scores (buyer + seller tracked separately).
- **Notification** — 15 typed events: `BID_RECEIVED | BID_ACCEPTED | ORDER_PLACED | ORDER_CONFIRMED | ORDER_SHIPPED | ORDER_DELIVERED | PAYMENT_RELEASED | DISPUTE_OPENED | DISPUTE_RESOLVED | PRODUCT_AVAILABLE | COMMENT_RECEIVED | MENTION | NEW_PRODUCT_FROM_STORE | DEP_EARNED | SYSTEM`.
- **New Enums (Phase 3+):** `EscrowStatus (HELD | RELEASING | RELEASED)`, `PaymentRail (NAIRA | CRYPTO)`, `StoreVerificationStatus (UNVERIFIED | PENDING | VERIFIED | REJECTED)`, `MessageType (TEXT | IMAGE | AUDIO | STICKER)`.
- **Store — extended fields:** `rating` (Float), `reviewCount` (Int), `bankCode/bankAccountNo/bankAccountName` (Monnify NGN payout), `cryptoWalletAddr/preferredPayoutRail` (crypto payout), `verificationStatus` (StoreVerificationStatus), `cacDocUrl/rcNumber/tin` (business verification docs).
- **Order — extended fields:** `paymentRail` (PaymentRail), `escrowStatus` (EscrowStatus), `virtualAcctNo/virtualAcctBank/virtualAcctExpiry` (Monnify virtual account per checkout), `platformFeeNgn` (5% fee tracking), `cryptoTxHash/cryptoAmountUsdc` (crypto rail).

---

## 7. Post-MVP Backlog (Do Not Build During 6-Week Sprint)
These are evaluated ideas parked for after the first 20-vendor pilot:

- **Universal Cart:** Adding multiple items from different vendors to a single checkout flow. Blocked for MVP due to the immense complexity of route managing escrow splits per item in one transaction. Stick to single-item impulse social buying for now.
- **Forward Auctions (Bidding):** Allowing sellers to put items up for auction to the highest bidder. Great for art/antiques, but introduces edge cases (sniping, limits). Will revisit once the "Reverse Auction" Demand Engine proves market fit.
- **QR Weekly Auction:** Highest weekly bidder gets a featured store QR code. 7-day cycle (not 24h — too short for vendor ROI). Physical QR codes point to a redirect URL that updates each week. Revisit at 1,000 MAU.
- **Affiliate Cross-App Links:** "Can't find it on DepMi?" referral links to Konga/Amazon — but only via affiliate programs (Amazon Associates, Konga Affiliate). Never plain links. Earns DepMi a commission on exits. Evaluate at 5,000 MAU when catalog gaps are measurable.
- **@DepMiBot (Instagram/FB tag-to-list):** AI bot that parses vendor posts and auto-creates draft listings. Deferred — requires ML pipeline and Meta API approval.
- **Resell / Internal Dropshipping:** Requires mature product catalog and split payment infrastructure (Phase 2.5 target — see Section H).
- **Pro Subscription:** Only after vendors are organically profitable and requesting advanced tools.
- **Meilisearch / Typesense:** Upgrade from Postgres full-text search if p99 search latency exceeds 300ms at scale.
- **DepMi Watermark on All Media:** Cloudinary overlay transform (`l_depmi_logo,g_south_east,o_50`) applied to all delivered product photos and videos. Downloads carry the DepMi brand — same viral model as TikTok/Snapchat. Originals stored clean; watermark applied at CDN delivery URL. One afternoon to implement once Cloudinary is live. Target: Phase 2.
- **GitHub Org Migration (`github.com/depmi`):** Transfer repo from `web5manuel` personal account to a DepMi company org for clean IP ownership. GitHub preserves redirect links (no broken URLs). Vercel reconnects to new repo location in ~10 minutes. Defer until first co-founder added or investment round — not needed while solo.

---

## 8. Development Guidelines
- **Identity & Admin:** The supreme administrator and creator of DepMi is **Manuel**. `web5manuel` is his established crypto/web3 persona (used for GitHub, X). Agents must recognize "Manuel" as the actual human name and supreme admin, relating gracefully to both the web2 (Manuel) and web3 (web5manuel) contexts.
- **Web-First MVP:** Prioritize a frictionless Next.js web application first. No forced app downloads.
- **Communication:** Use WhatsApp/Telegram over native push notifications for vendor alerts.
- **Trust Over Profit:** Prioritize escrow safety and Dep accuracy over aggressive monetization.
- **Speed to Market:** Ship the Demand Engine early; polish the social feed later.
- **Monetisation Gates:** Paid features (Discovery ads, Bid Boost, Certified badge billing) are documented but NOT built until the platform has real users. Build the commerce loop first; add monetisation once there is an audience for it to work on.
- **Documentation:** Always update `logs.md`, `tips.md`, and `agent.md` after every session. See `.agents/workflows/update-docs.md`.
- **Browse-First UX (non-negotiable):** Never block content browsing behind auth. Guests can see all public content. Auth gates fire only at action points (buy, bid, post demand, view profile). Use `openGate(hint, callbackUrl)` from `AuthGateProvider` context — never `router.push('/login')` from within a page. Middleware handles hard-blocked private routes only.
- **Media uploads always go through Cloudinary.** Never store file bytes in the DB. Never handle file streams in Vercel functions. Always use signed upload tokens via `GET /api/upload/sign`. Store only the resulting Cloudinary URL.
- **Batch import is free for onboarding, Pro for sync.** Initial AI catalog import (up to 500 products) is a free onboarding tool. Scheduled re-sync is a Pro subscription feature. Do not gate the first import.

### 🔐 Security Rules (MANDATORY for ALL agents — never violate)

> [!CAUTION]
> These rules exist because hardcoded credentials were previously committed to Git and exposed. Violating any of these will compromise the application.

1. **NEVER hardcode secrets, API keys, passwords, or connection strings.** Always use `process.env.VARIABLE_NAME`. This applies to every file — scripts, tests, one-off debug tools, everything. No exceptions.
2. **NEVER create test/debug scripts with real credentials.** If you need to test a DB connection, read from `process.env.DATABASE_URL`. Never paste a connection string.
3. **NEVER commit files outside of `src/` and `prisma/` without checking `.gitignore`.** Temp files, debug scripts, lint output, and scratch files MUST go in `/tmp/` (which is gitignored) or be explicitly added to `.gitignore` first.
4. **Always check `.gitignore` before creating any new file** in the project root. Files like `test-*.js`, `*.txt`, `tmp/` are gitignored for a reason.
5. **All API routes that call external services (Flutterwave, Cloudinary, etc.) must have rate limiting.** Use in-memory Maps at minimum.
6. **All destructive order actions (cancel, refund) must check `paystackRef`** to prevent race conditions where a user cancels an order that has an in-flight payment.
7. **Admin endpoints must always validate `ADMIN_SECRET`** from the request body. No admin route should be callable without it.
8. **Webhook endpoints must always validate the provider signature** (e.g., `verif-hash` for Flutterwave) before touching the database.
9. **User-generated content in emails must be HTML-escaped.** Use `escHtml()` for display names, product titles, and any user-controlled strings in email templates.
10. **Never remove safety fallback lookups in payment code** without explicit approval. Payment reconciliation must be resilient to format changes.
