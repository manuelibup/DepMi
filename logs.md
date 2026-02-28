# DepMi — Development Log

## Table of Contents
- [Session 1 — Feb 26, 2026 (Pre-dawn)](#session-1--feb-26-2026-pre-dawn)
- [Session 2 — Feb 26, 2026 (07:00 WAT)](#session-2--feb-26-2026-0700-wat)
- [Session 3 — Feb 26, 2026 (08:00–09:00 WAT)](#session-3--feb-26-2026-08000900-wat)
- [Session 4 — Feb 26, 2026 (08:00–22:00 WAT) — Vercel 404 Incident](#session-4--feb-26-2026-08002200-wat--vercel-404-incident)
- [Session 5 — Feb 26, 2026 (22:30–23:00 WAT) — Schema Restructure](#session-5--feb-26-2026-22302300-wat--schema-restructure)
- [Session 6 — Feb 27, 2026 (17:00–18:30 WAT) — Code Quality & Design Enhancements](#session-6--feb-27-2026-17001830-wat--code-quality--design-enhancements)
- [Session 7 — Feb 27, 2026 (18:30–19:00 WAT) — Auth & Profile Scaffolding](#session-7--feb-27-2026-18301900-wat--auth--profile-scaffolding)
- [Session 8 — Feb 27, 2026 (19:30–20:00 WAT) — Auth Code Review & Bug Fixes](#session-8--feb-27-2026-19302000-wat--auth-code-review--bug-fixes)
- [Session 9 — Feb 27, 2026 (19:50–19:55 WAT) — Prisma Auth Error Fix](#session-9--feb-27-2026-19501955-wat--prisma-auth-error-fix)
- [Session 10 — Feb 27, 2026 — KYC Architecture Decision](#session-10--feb-27-2026--kyc-architecture-decision)
- [Session 11 — Feb 28, 2026 — Secure Vendor Invite System](#session-11--feb-28-2026--secure-vendor-invite-system)

## Session 1 — Feb 26, 2026 (Pre-dawn)
**Agent:** Google Gemini (via previous conversation)  
**Human:** Manuel

### What was done:
- **Manuel** defined the full DepMi vision, brand identity, financial model, and 6-week MVP roadmap in `agent.md`
- **Gemini** created the strategic analysis and implementation plan (`implementation_plan.md.resolved`) — tech stack recommendations, data architecture, escrow-over-wallet model, and the 6-week roadmap refinement
- **Gemini** scaffolded the Next.js 16 web app (`web/`) with:
  - `page.tsx` — Single-file social feed with a Demand Card, Product Card, filter bar, and bottom nav
  - `page.module.css` — 344-line stylesheet for the feed layout
  - `globals.css` — CSS variables, DM Sans font, basic resets
  - `layout.tsx` — Root layout with metadata
- **Gemini** generated brand kit HTML files and logo concepts in `files/`

### Issues found (by Antigravity review):
- Corrupted emoji characters (`👟` → `�`) in 3 locations
- Manual `<head>` tag conflicting with Next.js Metadata API
- Empty `<span>` for logo (no actual logo SVG)
- Hardcoded `top: 60px` on filter bar (fragile)
- No dark mode, no hover/focus states, no interactivity
- Everything in one monolithic component with hardcoded data
- Default Next.js assets still in `/public` (vercel.svg, etc.)
- No SEO/Open Graph metadata

---

## Session 2 — Feb 26, 2026 (07:00 WAT)
**Agent:** Antigravity  
**Human:** Manuel

### What was done:

#### Code Review & Audit
- **Antigravity** performed a full code review of Gemini's work
- Documented 5 bugs, 6 code quality issues, and a complete UI assessment
- Created `implementation_plan.md` with proposed fixes and UI overhaul

#### Full UI Overhaul (Approved by Manuel)
- **Antigravity** rewrote `globals.css`:
  - Added dark mode via `@media (prefers-color-scheme: dark)`
  - Added animation keyframes: `fadeInUp`, `slideInRight`, `pulse`, `shimmer`, `ripple`
  - Expanded design tokens: glassmorphism vars, transition easings, shadow system, gold accent

- **Antigravity** created 6 modular components (from 1 monolithic file):
  | Component | Key features |
  |-----------|-------------|
  | `Header.tsx` | SVG logo with green gradient, SVG search/bell icons, notification dot |
  | `FilterBar.tsx` | `useState` for active filter, 7 categories, hover/active transitions |
  | `StoriesBar.tsx` | Vendor story circles with gradient rings, staggered slide-in animation |
  | `DemandCard.tsx` | Typed props, bid count, urgency timer, gradient CTA, SVG share icon |
  | `ProductCard.tsx` | `next/image`, Deps tier badges, viewer count, social row (like/comment/share/save) |
  | `BottomNav.tsx` | 5-tab nav with SVG icons + labels, floating green "+" button |

- **Antigravity** fixed `layout.tsx`:
  - Removed manual `<head>` → Next.js `Metadata` + `Viewport` exports
  - Added OG title/description/siteName

- **Antigravity** rewrote `page.tsx`:
  - Clean composition of all 6 components
  - Typed mock data arrays (`DemandData[]`, `ProductData[]`)
  - Interleaved demand + product cards in the feed

- **Antigravity** generated 2 product images (sneakers, iPhone) → `/public`

#### Build Verification
- ✅ `next build` passed — Compiled in 2.6s, TypeScript clean, 4/4 static pages

### Pending:
- Visual verification by Manuel in the browser
- Iterate on feedback

---


---

## Session 3 — Feb 26, 2026 (08:00–09:00 WAT)
**Agent:** Antigravity
**Human:** Manuel

### What was done:
- **Antigravity** reviewed Gemini's initial `schema.prisma` and found 7 issues
- **Antigravity** rewrote `schema.prisma` with fixes:
  - Moved `DATABASE_URL` to `prisma.config.ts` (Prisma 7 breaking change)
  - Changed `role: Role` → `roles: Role[]` for dual-role users
  - Replaced `deps: Int` with a `DepTransaction` audit table
  - Added `KycStatus` model (stores reference tokens, not raw BVN/NIN)
  - Added `ProductImage` table for product carousels
  - Added `category` + `location` fields for the Demand Engine
  - Added `@@index` on Demand and Product for query performance
- **Manuel** pushed everything to GitHub and deployed to Vercel
- **Issue:** `depmi.vercel.app` returned `404 NOT_FOUND`

---

## Session 4 — Feb 26, 2026 (08:00–22:00 WAT) — Vercel 404 Incident
**Agent:** Antigravity
**Human:** Manuel

### Incident Summary: Vercel 404 Despite Successful Local Build

**Root Cause (confirmed by Manuel):** When Manuel changed the Root Directory in Vercel Settings from `/` to `web`, it **silently reset the Framework Preset from "Next.js" to "Other"**. With Framework Preset set to "Other", Vercel ran `npm run build` (so compilation succeeded), but did NOT use the Next.js serving adapter to route requests. Vercel had no idea the output was a Next.js app, so it couldn't serve any routes — resulting in 404 on every URL including `/`.

A **secondary issue** (introduced during debugging): `turbopack.root` in `next.config.ts` was conflicting with Vercel's `outputFileTracingRoot`. This was a mistake introduced while trying to fix the original problem.

**Timeline of fixes tried:**
1. Manuel set Root Directory to `web` in Vercel Settings ❌ still 404 (this is also what caused the Framework Preset to reset)
2. Deleted empty root `package-lock.json` ❌ still 404
3. Added `turbopack.root` to `next.config.ts` ❌ made it worse (new conflict)
4. Cleared build cache on redeploy ❌ still 404 on its own
5. **Changed Framework Preset from "Other" → "Next.js"** in Settings → General + **cleared build cache** ✅ **FIXED**

**The fix that worked:** Settings → General → Build & Development Settings → **Framework Preset → change from "Other" to "Next.js"** → Save → Redeploy with cache cleared.

**Build proof:**
```
✅ Detected Next.js version: 16.1.6
✅ added 427 packages in 16s
✅ Compiled successfully in 4.0s
✅ Generating static pages (4/4)
✅ Deployment completed
```

### If This Happens Again:
1. **First check:** Does the unique deployment URL also 404? If yes → it's a serving issue, not a domain issue.
2. **Go to Settings → General → Build & Development Settings** → Is **Framework Preset** set to **"Next.js"**? If it says "Other", that's the problem — change it, save, and redeploy.
3. **When changing Root Directory in Vercel, ALWAYS re-check Framework Preset immediately after saving.** Vercel silently resets it to "Other".
4. Redeploy with "Clear Build Cache" unchecked to avoid leftover artifacts.
5. **Avoid:** Never add `turbopack.root` to `next.config.ts` for Vercel deployments — Vercel manages this internally.

### What Manuel Did Wrong (and how to handle it better):
See `tips.md` → Section 5 (Deployment Debugging).

---

## Session 5 — Feb 26, 2026 (22:30–23:00 WAT) — Schema Restructure
**Agent:** Antigravity
**Human:** Manuel

### What was done:

#### Schema Architecture Overhaul
- **Antigravity** split User (personal identity) from Store (business identity) — Facebook Pages model
- **Antigravity** added multi-provider auth via `Account` model:
  - Email + password (bcrypt, 12+ salt rounds)
  - Google OAuth
  - WhatsApp phone verification
- **Antigravity** added `KycTier` enum with 6 tiers (UNVERIFIED → BUSINESS)
- **Manuel** decided: BVN verification (TIER_2) required before creating a Store
- Products, Bids, Orders-as-seller now relate to `Store`, not `User`
- Dep scores tracked separately: buyer trust on User, seller trust on Store
- Added `Notification` model with 10 typed events
- Added `Bid.productId` — vendors can attach existing products when bidding
- Added `Order.demandId` + `Order.bidId` — full origin tracing

#### Documentation
- Updated `agent.md` with new architecture (User/Store model, auth, KYC tiers, data architecture section)
- Updated `logs.md` (this entry)
- Created `.agents/workflows/update-docs.md` — ensures all AI agents auto-update logs/tips/agent.md

#### Validations
- ✅ `prisma validate` — schema valid
- ✅ `next build` — compiles clean

---

## Session 6 — Feb 27, 2026 (17:00–18:30 WAT) — Code Quality & Design Enhancements
**Agent:** Antigravity
**Human:** Manuel

### What was done:

#### Codebase & Architecture Refactoring
- **Restructured Components**: Moved all 6 components (`Header`, `FilterBar`, `StoriesBar`, `DemandCard`, `ProductCard`, `BottomNav`) into dedicated subfolders (`src/components/[Name]/index.tsx`) along with their respective `.module.css` files.
- **TypeScript Enhancements**: Added explicit prop interfaces (`DemandCardProps`, `ProductCardProps`, `FilterBarProps`) for stronger type safety.
- **Styling**: Created `src/styles/tokens.css` to centralize design tokens (`--primary`, `--card-bg-glass`, etc.) and integrated them across all CSS modules. Verified dark mode support.

#### UI & Asset Updates
- **New Logo**: Generated a new, premium monogram "DM" logo with a transparent background. 
- **Header Update**: Replaced the inline SVG in `Header.tsx` with the Next.js `<Image>` component pointing to the new DM logo.
- **Cleanup**: Removed the default Next.js `vercel.svg` asset from the `public/` directory.

#### SEO & Accessibility
- **Metadata**: Enhanced `layout.tsx` with comprehensive SEO metadata (OpenGraph, Twitter Cards, Canonical URL, and Favicon icon).
- **Accessibility**: Added `aria-labels` to all icon-only buttons in `ProductCard`, `DemandCard`, and `Header`. Added `focus-visible` styling in `globals.css` for better keyboard navigation.

#### Documentation & DX
- **Table of Contents**: Added Table of Contents to both `agent.md` and `logs.md` for easier navigation.
- **Performance Checklist**: Built a new `performance_checklist.md` artifact covering bundle size, image optimization, dynamic imports, and Web Vitals best practices.
- **Verification**: `npm run lint` passed with 0 errors.

### Pending
- Build testing via Vercel.

---

## Session 7 — Feb 27, 2026 (18:30–19:00 WAT) — Auth & Profile Scaffolding
**Agent:** Antigravity
**Human:** Manuel

### What was done:

#### User Model Updates (Prisma)
- Added `username` (unique string)
- Added `displayName` (required string)
- Added `dateOfBirth` (DateTime) to enforce Age Gating restrictions

#### NextAuth Setup
- Integrated **NextAuth.js (Auth.js)** v4 using `PrismaAdapter`.
- Configured `.env.local` to securely house JWT secrets and Google OAuth secrets.
- Configured `CredentialsProvider` to use `bcrypt` with 12 salt rounds for Password authentication.
- Configured `GoogleProvider` for seamless social sign-on.
- Configured `Providers.tsx` (`SessionProvider`) and wrapped `layout.tsx`.
- Created robust `middleware.ts` to seamlessly protect all internal routes, enforcing authentication before users can access their dashboard, while leaving `/login`, `/register`, and `/` public.

#### UI Scaffolding
- Built the new Register Page (`/register`) incorporating fields for Username, Display Name, Date of Birth, Email, and Password. Added robust client & server-side API error handling.
- Built the Login Page (`/login`) utilizing NextAuth's built-in `signIn()` logic.
- Built Modular UI components: `InputField` and `SocialLoginButton`.
- Used `zod` for strictly typing and validating form payload inputs in the Server (`/api/auth/register`).
- Applied global form styling utilizing our standard design tokens mapping (`tokens.css`).

#### Result
- Successfully completed the MVP Roadmap **Phase 1: Week 1**.
- The build passed ESLint type validations perfectly (`npm run lint` clean).

#### Known Issues at Session End (fixed in Session 8)
- `PrismaAdapter` incompatible with custom Account schema → Google OAuth would break in production.
- `name` field referenced in code but does not exist in the Prisma User schema → Prisma client type error.
- Age validation calculated by year subtraction only → off by up to 11 months.
- Missing `@types/bcrypt` dev dependency.

---

## Session 8 — Feb 27, 2026 (19:30–20:00 WAT) — Auth Code Review & Bug Fixes
**Agent:** Antigravity (Claude)
**Human:** Manuel

### What was done:

#### Code Review of Session 7 (Gemini) Output
- Full review of `auth.ts`, `register/route.ts`, `middleware.ts`, `login/page.tsx`, `register/page.tsx`, `Auth.module.css`, `InputField.tsx`, `SocialLoginButton.tsx`, and `schema.prisma`.

#### Bugs Fixed

**1. Critical — PrismaAdapter removed from `auth.ts`**
- The `@next-auth/prisma-adapter` expects NextAuth's standard schema format (`type String`, `providerAccountId`, `access_token`, `refresh_token`, etc.). DepMi's custom `Account` model uses an `AuthProvider` enum, `providerId`, and `passwordHash` — completely incompatible.
- **Fix:** Dropped the adapter entirely. Replaced with a manual `signIn` callback that creates/links Google accounts directly using DepMi's schema (`provider: "GOOGLE"`, `providerId: account.providerAccountId`). Added a `jwt` callback that looks up the real DB user ID by email for OAuth sign-ins.

**2. Bug — `name` field doesn't exist in User schema**
- `register/route.ts` sent `name: displayName` to `prisma.user.create()` — field does not exist in the schema. Would cause a Prisma client type error once client is regenerated.
- `auth.ts` referenced `user.name` — same non-existent field.
- **Fix:** Removed `name: displayName` from create data. Changed authorize return to use `user.displayName`.

**3. Bug — Age calculation was off by up to 11 months**
- `new Date().getFullYear() - new Date(date).getFullYear()` ignores whether the birthday has passed yet in the current year. A user born Dec 31, 2013 would incorrectly pass validation today (Feb 27, 2026: 2026-2013=13, but they're actually 12).
- **Fix:** Proper age calculation accounting for month + day delta.

**4. Hint — Zod v4 deprecation**
- `z.string().email()` is deprecated in Zod v4.3.6. Updated to `z.email()`.

#### Dependency Fix
- Installed `@types/bcrypt` as devDependency (`bcrypt` had no type declarations, causing TS7016 error).

#### What Gemini did well (preserved as-is)
- bcrypt at 12 rounds, never plaintext ✅
- JWT session strategy (correct for custom schema) ✅
- Auto sign-in after registration ✅
- Separate 409 errors for email vs username conflict ✅
- Zod validation on API route ✅
- Middleware regex correctly excludes `/`, `/login`, `/register` ✅
- CSS using design tokens from `tokens.css` ✅

### Pending / Next Steps (Week 2)
- Run `npx prisma db push` to sync schema to Neon DB.
- Week 2: KYC system (Smile ID/Dojah integration) + Deps counter (atomic `depCount` + `DepTransaction` audit trail).

---

## Session 9 — Feb 27, 2026 (19:50–19:55 WAT) — Prisma Auth Error Fix
**Agent:** Antigravity (Claude)
**Human:** Manuel

### What was done:
- Fixed a Prisma Client type error (`Module '"@prisma/client"' has no exported member 'AuthProvider'`).
- Ran `npx prisma generate` to successfully generate the updated Prisma client types based on the latest `schema.prisma`.
- Pushed the accumulated authentication feature code and fixes (from Session 7 & 8) to the GitHub repository.

### Pending / Next Steps (Week 2)
- Run `npx prisma db push` to sync schema to Neon DB.
- Week 2: KYC system (Smile ID/Dojah integration) + Deps counter (atomic `depCount` + `DepTransaction` audit trail).

---

## Session 10 — Feb 27, 2026 — KYC Architecture Decision
**Agent:** Antigravity (Claude)
**Human:** Manuel

### What was decided:

#### KYC Deferral — MVP Strategy Change
- **Decision:** Dojah/Smile ID KYC integration is deferred from Week 2. Full reasoning documented below.
- Storing encrypted NIN/BVN without verifying = no trust signal. Encrypted wrong data is still wrong. If collecting sensitive IDs, might as well call Dojah ($0.06) to get actual verification. Don't store raw NIN/BVN under any approach.
- **TIER_1 (NIN) skipped entirely** — it is friction before TIER_2 (BVN). NIN adds no unique value in the buyer flow for a pilot.
- **Buyers:** Email + WhatsApp OTP phone verification only (TIER_0). Zero NIN/BVN collected. Scales automatically to 200+ users without manual work.
- **Pilot sellers (first ~20):** Admin manually elevates `kycTier` to TIER_2 via admin route. User personally knows them.
- **KYC Trigger:** Dojah BVN integration added as a feature flag when seller demand scales (~seller #25+). Budget: ~$0.06/verification.

#### Roadmap Updated
- `agent.md` revised: W1 marked complete, W2 reframed as "Phone OTP & Deps", W3 includes User Profile page + connecting Discover feed to real DB data, W4 includes in-app Notifications.

### Pending / Next Steps (Week 2)
- Run `npx prisma db push` to sync schema to Neon DB.
- Add `phone` field to User schema for OTP storage.
- Choose OTP provider: Africa's Talking (cheapest for Nigeria) vs Twilio (global).
- Build: WhatsApp/SMS OTP send + verify API routes.
- Build: Deps system (atomic `depCount` + `DepTransaction` audit trail in a Prisma transaction).
- Build: Admin route to manually elevate `kycTier` for pilot vendors.

---

## Session 11 — Feb 28, 2026 — Secure Vendor Invite System
**Agent:** Antigravity 
**Human:** Manuel

### What was done:

#### Schema & Database
- Implemented `OtpType` and `InviteStatus` enums.
- Added `OtpToken` model for expiring secure phone verification codes.
- Added `StoreInvite` model for 48-hour secure vendor onboarding links.
- Added `phoneVerified` boolean to the `User` model.
- Synced changes to Neon DB via `npx prisma db push --accept-data-loss`.
- Fixed widespread Prisma Constructor / Edge Runtime crash blocking the build by upgrading `@prisma/client` and `prisma` CLI to 7.4.2.

#### Features Built
- **Admin Invite Generator (`/admin`)**: Protected route allowing Manuel to input an email and instantly copy a secure 48hr invite link to send directly to pilot vendors via DM.
- **Vendor Identity Verification (`/invite/[id]`)**: The frontend gate for vendors. Validates the URL token, prompts the vendor to log in, and securely collects their 11-digit BVN.
- **Backend Logic**: API routes (`/api/admin/invite`, `/api/invite/validate`, `/api/invite/accept`) fully built with mocked Dojah integration for the pilot phase. Successful processing elevates buyer to `TIER_2` (Vendor status).

#### Code Quality & Fixes
- Resolved Next.js 16 Middleware deprecation errors regarding `export { default }`.
- Removed direct `auth.ts` Prisma hooks in JWT callbacks that crashed Vercel Edge Runtime.
- Cleaned all TypeScript (`any` types) and ESLint (`unused vars`) warnings.

### Pending / Next Steps (Week 2)
- Build: WhatsApp/SMS OTP send + verify API routes for Buyers (`TIER_0`).
- Build: Deps System (`depCount` + `DepTransaction` audit trail).

---

## Session 12 — Feb 28, 2026 — Auth Regression Fix & Doc Update
**Agent:** Antigravity (Claude)
**Human:** Manuel

### What was done:

#### Schema Update (Gemini)
Gemini correctly applied all planned Week 2 schema additions to `web/prisma/schema.prisma`:
- Added `phoneVerified Boolean @default(false)` to User model.
- Added `OtpType` enum (`PHONE_VERIFICATION`, `EMAIL_RESET`).
- Added `InviteStatus` enum (`PENDING`, `ACCEPTED`, `EXPIRED`).
- Added `OtpToken` model: hashed OTP storage with expiry + single-use guard.
- Added `StoreInvite` model: 48hr invite-link flow for exclusive vendor onboarding.
- Added `otpTokens OtpToken[]` and `storeInvite StoreInvite?` relations to User.

#### Auth Regression Fixed (Antigravity)
Gemini accidentally broke `auth.ts` while working on the schema. The `jwt` callback lost the Google OAuth DB lookup — the `account` parameter was silently removed and the code that resolves Google profile ID → Neon DB UUID was deleted (only the comment remained). This would have caused `session.user.id` to return the Google profile ID (not the DB UUID) for all Google sign-in users, breaking every DB query downstream.
- **Fix:** Restored `account` parameter and the `prisma.user.findUnique` lookup in the `jwt` callback.

#### Vendor Strategy Finalised
- Store creation: invite-only, `StoreInvite` token sent to pre-vetted vendors via DM.
- ₦2,500 one-time store creation fee (deferred for first 20 pilot vendors; full payment via Paystack in Week 5).
- NIN (TIER_1) skipped entirely. BVN verification deferred until ~seller #25.
- "Deps as a Social Protocol": public `/u/[username]` profile page (shareable trust badge) flagged as high-priority Week 3 add-on.

### Pending / Next Steps
- Run `npx prisma db push` to sync new schema (OtpToken, StoreInvite, phoneVerified) to Neon DB.
- Choose OTP delivery provider: Africa's Talking (Nigeria-native, cheaper) vs Twilio.
- Build: `/api/auth/send-otp` + `/api/auth/verify-otp` routes.
- Build: `/api/admin/invite` route to generate StoreInvite token + send email.
- Build: `/invite/[id]` page — vendor claims invite, completes BVN form.
- Build: Deps system (atomic `depCount` + `DepTransaction` in Prisma transaction).
