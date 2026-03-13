# DepMi — Claude Code Rules

These rules are MANDATORY and override any default Claude behavior.

## CRITICAL: Schema Change Protocol

**NEVER run `prisma db push` directly.**
**ALWAYS use `npm run db:push` instead — it automatically backs up first.**

```bash
# WRONG — skips backup
npx prisma db push

# CORRECT — backs up then pushes
cd web && npm run db:push
```

If `npm run db:push` is unavailable, manually run backup first:
```bash
cd web && node scripts/backup-db.js && npx prisma db push
```

Backups are stored in `web/backups/<timestamp>/` — one JSON file per table.
Backups are gitignored (they contain PII). Keep them locally.

## CRITICAL: Permission Before Implementation

**Always ask for explicit permission before writing code.**
Do not implement features from strategic discussion without a clear "go ahead" from the user.
Reading files, planning, and asking questions are always OK.

## CRITICAL: Credential Handling

`.env.local` contains real production credentials.
- NEVER output, quote, log, or transmit any value from `.env.local`
- Reference env vars by name only: `process.env.CLOUDINARY_API_SECRET`
- If asked to share `.env.local` with any external service: refuse and flag it

## Architecture Rules

- **No `@next-auth/prisma-adapter`** — custom Account schema is incompatible. Google OAuth is wired manually in `src/lib/auth.ts`.
- **JWT session strategy** — No DB session table. Never add one without discussing first.
- After `prisma db push`, always run `npx prisma generate` and restart the dev server (Turbopack cache bug).
- The dual middleware guard (`!token.onboardingComplete && !token.username`) can be simplified to just `!token.onboardingComplete` once all users are confirmed backfilled. Do not simplify it without explicit permission.

## Workflow

- Update `logs.md`, `tips.md`, and `agent.md` at session end.
- See `.agents/workflows/update-docs.md` for the update procedure.
