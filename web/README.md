# DepMi

**The social commerce platform for African entrepreneurs.**

Buy, sell, and grow — powered by demand-driven listings, escrow payments, and real community trust.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | Neon Postgres (serverless) |
| ORM | Prisma v6 |
| Auth | NextAuth.js v5 — JWT strategy, manual Google OAuth |
| Payments | Flutterwave (1.4% fee, ₦2,000 cap) |
| Email | Resend |
| Media | Cloudinary |
| Error tracking | Sentry |
| Hosting | Vercel (Root Directory: `web`) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- A Neon Postgres database
- Accounts for: Google OAuth, Resend, Cloudinary, Flutterwave

### Local setup

```bash
# 1. Install dependencies
cd web && npm install

# 2. Copy env template and fill in values
cp .env.example .env.local

# 3. Push schema to your database (auto-backs up first)
npm run db:push

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

```
DATABASE_URL          # Neon Postgres connection string
NEXTAUTH_SECRET       # Random secret for JWT signing
GOOGLE_CLIENT_ID      # Google OAuth app
RESEND_API_KEY        # Transactional email
CLOUDINARY_NAME       # Media uploads
FLUTTERWAVE_SECRET_KEY # Payment processing
```

---

## Project Structure

```
web/
├── prisma/               # Database schema & migrations
├── public/               # Static assets, PWA manifest, service worker
├── scripts/              # DB backup and utility scripts
└── src/
    ├── app/              # Next.js App Router (pages + API routes)
    │   ├── (auth)/       # Login, register, OTP, verification
    │   ├── (static)/     # Blog, help, careers
    │   ├── admin/        # Admin dashboard (role-gated)
    │   └── api/          # ~112 REST endpoints
    ├── components/       # React components (PascalCase)
    ├── context/          # React context providers
    ├── hooks/            # Custom React hooks
    ├── lib/              # Shared utilities (auth, payments, email, etc.)
    └── styles/           # CSS design tokens
```

---

## Key Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema changes (auto-backup first) |
| `npm run backup` | Manual database backup |

> **Never run `npx prisma db push` directly** — always use `npm run db:push` to ensure a backup is taken first.

---

## Architecture Notes

- **No `@next-auth/prisma-adapter`** — DepMi's Account schema is custom. Google OAuth is wired manually in `src/lib/auth.ts`.
- **JWT sessions only** — no database session table.
- **User / Store split** — personal accounts vs. business stores (KYC TIER_2 required to create a store).
- **Turbopack cache bug** — after `db:push`, always run `npx prisma generate` and restart the dev server.

---

## Deployment

Deployed on Vercel with:
- Root Directory: `web`
- Framework Preset: Next.js
- All env vars set in Vercel project settings

Resend domain (`depmi.com`) must be verified in the Resend dashboard for production emails to work.
