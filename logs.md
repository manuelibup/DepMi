# DepMi — Development Log

## Table of Contents
- [Session 1 — Feb 26, 2026 (Pre-dawn)](#session-1--feb-26-2026-pre-dawn)
- [Session 2 — Feb 26, 2026 (07:00 WAT)](#session-2--feb-26-2026-0700-wat)
- [Session 3 — Feb 26, 2026 (08:00–09:00 WAT)](#session-3--feb-26-2026-08000900-wat)
- [Session 4 — Feb 26, 2026 (08:00–22:00 WAT) — Vercel 404 Incident](#session-4--feb-26-2026-08002200-wat--vercel-404-incident)
- [Session 5 — Feb 26, 2026 (22:30–23:00 WAT) — Schema Restructure](#session-5--feb-26-2026-22302300-wat--schema-restructure)
- [Session 6 — Feb 27, 2026 (17:00–18:30 WAT) — Code Quality & Design Enhancements](#session-6--feb-27-2026-17001830-wat--code-quality--design-enhancements)

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
