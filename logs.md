# DepMi — Development Log

---

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

**Root Cause (confirmed):** Vercel was restoring a **stale build cache** (`node_modules`) from an earlier deployment that was made *before* the Root Directory was set to `web/`. That cached install had ~0 real packages (from the repo root which has an empty `package.json`). When Vercel's Next.js adapter tried to trace the output files, the wrong `node_modules` caused it to generate an incomplete `/vercel/output`, resulting in `404` for every route.

A **secondary issue**: `turbopack.root` in `next.config.ts` was set to `import.meta.dirname` (the `web/` path), which conflicted with Vercel's own `outputFileTracingRoot` setting (`/vercel/path0`). The warning in the build logs confirmed this conflict.

**Timeline of fixes tried:**
1. Identified Root Directory not set → Manuel set it to `web` in Vercel Settings ❌ still 404
2. Deleted empty root `package-lock.json` that was confusing the build system ❌ still 404
3. Added `turbopack.root` to `next.config.ts` → actually made it **worse** (conflicted with Vercel's tracing)
4. Fixed `turbopack.root` to use `import.meta.dirname` (ESM fix) ❌ still 404
5. **Removed all `turbopack` config from `next.config.ts`** (clean slate) + **Redeployed with "Clear Build Cache" checked** ✅ **FIXED**

**The fix that worked:** Redeploy → three dots on deployment → Redeploy → **uncheck "Use existing Build Cache"** → Deploy. Fresh `npm install` pulled 427 correct packages.

**Build proof:**
```
✅ Detected Next.js version: 16.1.6
✅ added 427 packages in 16s
✅ Compiled successfully in 4.0s
✅ Generating static pages (4/4)
✅ Deployment completed
```

### If This Happens Again:
1. **First check:** Does the unique deployment URL (e.g. `depmi-abc123.vercel.app`) also 404? If yes → it's a build/serving issue, not a domain issue.
2. **Check build logs:** `added X packages in Ys` means fresh install. `up to date in <2s` means cache was used → **suspect stale cache**.
3. **Fix:** Redeploy → three dots → Redeploy → **uncheck "Use existing Build Cache"** → confirm.
4. **Avoid:** Never add `turbopack.root` to `next.config.ts` when deploying on Vercel — Vercel sets its own `outputFileTracingRoot` and they conflict.

### What Manuel Did Wrong (and how to handle it better):
See `tips.md` → Section 5 (Deployment Debugging).

