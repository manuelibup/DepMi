# DepMi — Growth Playbook

This file has two tracks: **Manuel's personal engineering growth** and **DepMi's product/business growth**.
Read it at the start of every session. Update it when something changes.

---

## Pre-Deploy QA Checklist

Run this before EVERY push to main. Takes 5 minutes. Skipping it has cost you production incidents.

```
BUILD
[ ] npm run build — zero errors, zero type errors
[ ] No new `as any` introduced without a // TODO comment explaining why

FLOW TEST (test only what you changed)
[ ] Open the feature in a fresh browser tab (not your dev tab with cached state)
[ ] Complete the full user flow end-to-end at least once
[ ] Test as a logged-out guest if the change touches public pages
[ ] Test as a different user role if the change touches permissions

MOBILE
[ ] Open DevTools → toggle device toolbar → iPhone SE (375px)
[ ] No horizontal scroll
[ ] Tap targets are reachable (nothing hidden behind nav or keyboard)
[ ] Text is readable (not clipped, not overflowing)

CSS/VISUAL
[ ] No hardcoded #00C853 or rgba(0,200,83,...) — use var(--primary) only
[ ] Dark mode looks correct (toggle with DevTools)
[ ] No layout shift on page load (images have width/height set)

DATABASE
[ ] If schema changed: npm run db:push (never npx prisma db push directly)
[ ] If schema changed: npx prisma generate + restart dev server
[ ] No raw npx prisma db push in terminal history

SECURITY SPOT CHECK (only if touching auth/payments/user data)
[ ] New API routes have session/auth check
[ ] User input is sanitized or validated with Zod before touching DB
[ ] No env var values logged or returned in API responses
```

---

## Track 1: Manuel — Engineering Skill Ladder

### Current Score: 80/100
Target: 90/100 within 12 months.
The gap is entirely discipline, not talent.

---

### Phase 1 — Right Now (0–3 months): Close the gaps already hurting you

- [ ] **SQL & indexes.** Read *Use The Index, Luke* (free: use-the-index-luke.com). 2 hrs/week.
      Know what Prisma is generating. One missing index at 10k users = site crawl.
- [ ] **Read Sentry daily.** Every error. The EPERM crash ran in production for weeks unnoticed.
      Make it a morning habit: open Sentry before opening VS Code.
- [ ] **Fix TypeScript errors, don't suppress them.** No more `as any` unless documented with a comment explaining why and a TODO to fix it. Every suppressed error is a future runtime crash.
- [ ] **Git discipline.** Meaningful commit messages. Feature branches even when solo.
      Bad: `"session 73 updates"`. Good: `"perf: lazy-load feed images, add fetchpriority to LCP"`
- [ ] **Pre-push checklist (run before EVERY deploy):**
      1. `npm run build` — does it compile clean?
      2. Test the specific user flow that changed, locally in prod mode
      3. Read your own diff — not glance, read
      4. Check mobile layout if you touched CSS

---

### Phase 2 — Months 3–9: Systems thinking

- [ ] **Learn how Next.js actually works.** Not just how to use it.
      App Router internals, RSC, streaming, edge vs Node runtime.
      Watch: Lee Robinson's architecture talks, Theo's deep dives.
- [ ] **Caching.** At 5k users the Neon free tier collapses under read pressure.
      Learn: `unstable_cache`, `revalidatePath`, HTTP cache headers in Next.js, Redis basics.
- [ ] **Queues & background jobs.** Never do notifications/payouts synchronously in API routes.
      Learn: Trigger.dev (free tier, Nigerian-friendly) or BullMQ.
      This is what separates toy apps from production systems.
- [ ] **Security fundamentals.** Read OWASP Top 10 once, seriously.
      You handle real money. Rate limiting, input sanitization, CSRF are not optional.

---

### Phase 3 — Year 1–2: Scale engineering

- [ ] **Read *Designing Data-Intensive Applications* (Kleppmann).** One chapter/week.
      Single best investment for someone building a platform that needs to scale.
- [ ] **Observability.** Structured logging. At 10k users you must be able to answer:
      "Why did this user's checkout fail at 2am Saturday?" in under 5 minutes.
- [ ] **Go deep on PostgreSQL.** Indexing strategies, EXPLAIN ANALYZE, connection pooling, partitioning.
      This serves DepMi for its entire lifetime.

### What NOT to learn (stay focused):
- React Native — not yet
- Blockchain / Web3 — not yet
- ML / AI models — not yet
Depth beats breadth when building a real product.

---

## Learning Resources — Exact Links, No Filler

### SQL & Databases (Phase 1)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Use The Index, Luke](https://use-the-index-luke.com) | Book (web) | Free | Best practical index guide. Teaches exactly what breaks at scale. Start here. |
| [Hussein Nasser — Database Engineering](https://www.youtube.com/@hnasr/playlists) | YouTube | Free | Deep Postgres/SQL dives. His "Fundamentals of Database Engineering" playlist is gold. |
| [Prisma's query logging](https://www.prisma.io/docs/concepts/components/prisma-client/logging) | Docs | Free | Enable `log: ['query']` in dev. Read what SQL Prisma is actually generating for you. |
| [PostgreSQL EXPLAIN visualizer](https://explain.depesz.com) | Tool | Free | Paste EXPLAIN ANALYZE output, see what's slow. Use this when pages feel slow. |

### TypeScript (Phase 1)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Matt Pocock — Total TypeScript (free tutorials)](https://www.totaltypescript.com/tutorials) | Interactive | Free | THE best TypeScript teacher. Start with "Beginner's TypeScript". Do one exercise per day. |
| [TypeScript Handbook — Narrowing chapter](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) | Docs | Free | Teaches you how to kill `as any` properly. One afternoon read. |
| [TypeScript Handbook — Generics chapter](https://www.typescriptlang.org/docs/handbook/2/generics.html) | Docs | Free | The other chapter that matters most for your codebase. |
| [Matt Pocock YouTube](https://www.youtube.com/@mattpocockuk) | YouTube | Free | Short, practical TypeScript tips. Watch while eating. |

### Git (Phase 1)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Conventional Commits spec](https://www.conventionalcommits.org) | Docs | Free | The standard for commit messages. `feat:`, `fix:`, `perf:`, `chore:`. 5-min read, use it immediately. |
| [Oh My Git!](https://ohmygit.org) | Game | Free | Teaches git visually. Best for understanding branching and rebasing. |
| [Pro Git book](https://git-scm.com/book) | Book | Free | Chapters 2–3 cover everything you need right now. |

### Web Performance & Core Web Vitals (Phase 1–2)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [web.dev/learn/performance](https://web.dev/learn/performance) | Course | Free | Google's structured performance course. Best starting point. Covers LCP, CLS, INP in depth. |
| [web.dev/vitals](https://web.dev/articles/vitals) | Docs | Free | Explains each Core Web Vital metric and what causes it to fail. Read alongside PageSpeed reports. |
| [PageSpeed Insights](https://pagespeed.web.dev) | Tool | Free | Run it on every major page after deployments. Catches regressions early. |
| [Chrome DevTools — Performance panel](https://developer.chrome.com/docs/devtools/performance/) | Docs | Free | Record traces of real page loads. See exactly which JS/images are blocking render. |
| [Smashing Magazine — Performance](https://www.smashingmagazine.com/category/performance/) | Articles | Free | Practical real-world articles. Search "Next.js performance" for directly applicable guides. |
| [Cloudinary docs — Image optimization](https://cloudinary.com/documentation/image_optimization) | Docs | Free | How to use f_auto, q_auto, c_limit, eager transforms. Directly reduces your Cloudinary costs. |
| [Cloudinary — Named transformations](https://cloudinary.com/documentation/named_transformations) | Docs | Free | Pre-generate transformations at upload time so first-user requests are instant. |

### Cost Optimisation Checklist (run monthly)
```
IMAGES
[ ] Check Cloudinary bandwidth usage in dashboard — target < 5 GB/month at current scale
[ ] Ensure upload routes compress with Sharp before sending to Cloudinary
[ ] Review largest images in Cloudinary Media Library — delete originals > 2 MB

DATABASE (Neon)
[ ] Check compute hours in Neon console — should be < 50 CU-hr/month at current scale
[ ] Connection pooling is enabled (PgBouncer mode in Neon project settings)
[ ] No N+1 queries — enable Prisma query logging in dev and read the SQL

VERCEL FUNCTIONS
[ ] /api/feed/featured has Cache-Control: s-maxage=120 (CDN caches it)
[ ] /api/stats has Cache-Control: s-maxage=300 (CDN caches it)
[ ] ActivityPing fires once per session, not per navigation

EMAIL (Resend)
[ ] OTP route has rate-limiting (1 OTP per email per 60 seconds)
[ ] Check Resend dashboard monthly send count — free tier is 3,000/month

SHIPBUBBLE
[ ] Quote API called only when checkout opens, not on every keystroke/state change
[ ] Consider sessionStorage caching for quotes (same address+product for 10 min)
```

### Next.js Internals (Phase 2)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Lee Robinson YouTube](https://www.youtube.com/@leerob) | YouTube | Free | Works at Vercel. His App Router and caching videos are the definitive source. |
| [Theo (t3.gg) YouTube](https://www.youtube.com/@t3dotgg) | YouTube | Free | Opinionated but deep. His "You Don't Know Next.js" series. Watch critically. |
| [Jack Herrington YouTube](https://www.youtube.com/@jherr) | YouTube | Free | Best deep-dive RSC and server component videos. More technical than Theo. |
| [Next.js caching docs](https://nextjs.org/docs/app/building-your-application/caching) | Docs | Free | Read this once properly. The 4-layer caching model. Required reading before you add Redis. |

### Caching & Redis (Phase 2)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Redis University](https://university.redis.io) | Course | Free | Official Redis courses. "Redis for JavaScript Developers" is the right one. |
| [Fireship — Redis in 100 Seconds](https://www.youtube.com/watch?v=G1rOthIU-uo) | YouTube | Free | Fast overview. Watch first before going deep. |
| [Upstash](https://upstash.com) | Tool | Free tier | Serverless Redis that works with Vercel/Neon stack. This is what you'll actually use on DepMi. |

### Security (Phase 2)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [PortSwigger Web Security Academy](https://portswigger.net/web-security) | Interactive labs | **Free** | THE best web security resource that exists. Hands-on labs for SQL injection, XSS, CSRF, auth attacks. One lab per week. |
| [OWASP Top 10](https://owasp.org/www-project-top-ten/) | Docs | Free | Read once. Understand what each category means for DepMi specifically. |
| [Snyk — free vulnerability scanner](https://snyk.io) | Tool | Free tier | Scans your dependencies for known CVEs. Run it quarterly. |

### Queues & Background Jobs (Phase 2)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Trigger.dev docs](https://trigger.dev/docs) | Docs | Free tier | What you'll actually use on DepMi. Nigerian-friendly (Vercel-compatible, no Redis needed). Best DX for Next.js background jobs. |
| [Trigger.dev YouTube tutorials](https://www.youtube.com/@triggerdotdev) | YouTube | Free | Their own channel has short, practical videos. |

### System Design (Phase 3)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Designing Data-Intensive Applications](https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/) — Kleppmann | Book | ~$50 / free PDF online | The single most important engineering book for someone building a platform. One chapter/week. |
| [ByteByteGo YouTube](https://www.youtube.com/@ByteByteGo) | YouTube | Free | Best system design channel. Alex Xu (author of System Design Interview books). Watch 1 video/week. |
| [System Design Interview — Alex Xu](https://www.amazon.com/System-Design-Interview-insiders-Second/dp/B08CMF2CQF) | Book | ~$30 | More accessible than DDIA. Good before DDIA if DDIA feels heavy. |
| [Gaurav Sen YouTube](https://www.youtube.com/@gkcs) | YouTube | Free | Great system design explanations. Complements ByteByteGo. |

### PostgreSQL Deep Dive (Phase 3)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Hussein Nasser — Postgres playlists](https://www.youtube.com/@hnasr/playlists) | YouTube | Free | Best Postgres deep dives on YouTube. Watch "Fundamentals of Database Engineering". |
| [The Art of PostgreSQL](https://theartofpostgresql.com) | Book | ~$49 | Goes deep on writing expert SQL. Worth it when you're ready for Phase 3. |
| [Neon docs — connection pooling](https://neon.tech/docs/connect/connection-pooling) | Docs | Free | Specific to your stack. Read before you hit 1k users. |

### Observability (Phase 3)
| Resource | Format | Cost | Why |
|---|---|---|---|
| [Sentry docs — Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/) | Docs | Free tier | Set it up properly (you have it half-configured). Source maps, performance monitoring, user context. |
| [OpenTelemetry for Next.js](https://nextjs.org/docs/app/building-your-application/optimizing/open-telemetry) | Docs | Free | When you outgrow Sentry's free tier. Future-proofing. |

### Weekly Learning Schedule (realistic for a founder)
```
Monday    15 min — Read one Use The Index, Luke page
Wednesday 30 min — One Total TypeScript exercise
Friday    20 min — Watch one ByteByteGo or Hussein Nasser video
Weekend   45 min — One PortSwigger security lab (once/month)
```
Compound interest. 110 minutes/week = meaningfully better engineer in 6 months.

---

### The 4 Specific Flaws to Fix (from score review)

| Flaw | Current | Target | Fix |
|---|---|---|---|
| Attention to detail | 67 | 82 | Re-read every diff. Run QA checklist before every deploy. |
| Production discipline | 78 | 88 | Test in prod build mode locally before pushing. UptimeRobot + Sentry alerts. |
| Architecture reactivity | 74 | 83 | 30-min "approach note" before any feature touching auth/payments/schema. |
| Grammar/docs hygiene | 69 | 80 | One re-read before sending prompts. 2-week tips.md review calendar reminder. |

---

## Track 2: DepMi — Business Growth

### Current State (always update from https://depmi.com/api/stats)
- Users: 279 | Stores: 74 | Listings: 171
- Launch date: Mar 10, 2026
- No completed orders yet (core escrow loop untested in production)
- ~12 signups/day (spike week of Mar 17–23 — verify if sustained)

---

### The Single Most Important Thing Right Now

**Complete one real order through escrow.** End-to-end. Real money. Real buyer. Real seller.
Until this happens, DepMi's core product is unproven.
Pick a trusted vendor. Buy something small. Walk the full flow.
This is more important than any new feature.

---

### Growth Milestones & Honest Likelihood

| Milestone | Likelihood | Timeline |
|---|---|---|
| 500 users | 92% | 6–10 weeks |
| 1,000 users | 78% | 3–5 months |
| 5,000 users | 48% | 10–18 months |
| 10,000 users | 32% | 18–28 months |
| 100,000 users | 11% | 4–7 years |
| 1,000,000 users | 6% bootstrapped / 18% funded | 6–12 / 3–5 years |

| Revenue Milestone | Likelihood | Timeline |
|---|---|---|
| First ₦100k in platform fees | 80% | 1–2 months |
| $1,000/month | 25% | 18–28 months |
| $10,000/month | 13% | 4–6 years |
| $100,000/year | 8% bootstrapped / 22% funded | 6–9 / 3–5 years |

---

### The 3 Variables That Change Everything

1. **First completed order.** If the escrow loop works in production, the revenue projections shift upward.
2. **Seller activation.** 62 stores with 126 listings = 2 listings/store average. Get 20 active stores with 10+ products each. The feed becomes compelling and the demand engine has real supply.
3. **One distribution channel that scales.** One TikTok/Reel showing a buyer posting a demand and a seller completing it within 24 hours = more signups than the last 13 days combined.

---

### Key Metric to Watch
- **28% store-creation rate** (62/222) — over 1 in 4 users opened a store.
  Healthy marketplace ratio is 5–10%. This is a strong supply-side signal.
  Protect it. Don't let it drop below 15%.

---

## Track 3: Getting Hired (if needed for funding)

### Realistic Timeline: 3–6 weeks to offer, not "this week"
Fastest money: freelance (Upwork, $25–35/hr). First gig possible in 7–10 days.

### The Portfolio Artifact (build in Day 1–2)
One Notion page showing:
- What DepMi is (one sentence)
- Stack: Next.js 16, Prisma, Neon, Flutterwave, Shipbubble, Cloudinary, NextAuth
- Numbers: 222 users, 62 stores, 126 listings, live at depmi.com, built solo in 12 days
- 2–3 screenshots

This IS your resume. You don't need a CV for any of the paths below.

### Target List — Lagos Funded Startups (apply by direct email to founder/CTO)
- Paystack (Stripe-owned) — product engineers
- Flutterwave — you're a customer, mention it
- Bumpa — direct market knowledge
- Kuda Bank — aggressive hiring history
- Trove Finance, Cowrywise, Mono — fintech, pay well
- Eden Life, Omnibiz, Sabi — ops-heavy, need product engineers

**The email that gets read:**
> Subject: Product Engineer — Built a social commerce platform solo (depmi.com)
>
> Hi [Name], I'm Manuel, 19. I built DepMi (depmi.com) — a social commerce platform for African entrepreneurs — solo, from zero to 222 users and 62 stores in 13 days post-launch. Stack: Next.js 16, Prisma/Neon, Flutterwave, Shipbubble logistics integration. Looking for a product engineer role. [Notion link]. Happy to call this week.

### Remote Channels (in order of quality for your profile)
1. **Arc.dev** — vets once, matches you to US companies. Apply + complete assessment.
2. **YC Work at a Startup** (workatastartup.com) — apply to 20–30 Series A or below. No degree filter.
3. **X/Twitter thread** — "I built a full social commerce platform in 12 days, solo, at 19." Builders hire from these.
4. **Toptal** — high bar (5-step), but $60–150/hr freelance if you pass.
5. **Wellfound/AngelList** — filter early-stage, apply as "founding engineer."

### Salary Reference
| Market | Role | Monthly |
|---|---|---|
| Lagos local | Junior Full Stack | ₦200k – ₦450k |
| Lagos funded startup | Product Engineer | ₦350k – ₦700k |
| Remote EU/UK | Junior Full Stack | $2,000 – $3,500 |
| Remote US startup | Junior Product Engineer | $3,000 – $5,000 |
| Remote US/EU (after DSA prep) | Junior SWE | $4,500 – $6,500 |
| FAANG (3–4 months DSA prep) | SWE L3/E3 | $120k – $180k/year |

**Note on FAANG:** They test DSA + system design, not portfolios. Requires 3–4 months of deliberate LeetCode + system design prep. Worth it if you want the salary, but not the fastest path to funding DepMi.

---

## Reminders

- Re-read this file at the start of every month.
- Update the live stats section every session (fetch https://depmi.com/api/stats).
- Update milestones when crossed.
- When you complete the first real order through escrow — mark it here and celebrate. It's the most important milestone DepMi has left.
