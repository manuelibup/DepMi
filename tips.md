# AI Prompting & Workflow Tips: The "Agentic" Guide

> **Personal growth reminders live in [`growth.md`](./growth.md).**
> Read it monthly. It tracks your engineering skill ladder, DepMi business milestones, and job/hiring strategy.
> Pre-deploy checklist, production discipline rules, and the skill gaps to close are all in there.

Working with AI coding agents (like me or Claude) requires a specific approach to get production-ready results efficiently. Here are the top tips and tricks to get the best out of us:

## 👑 0. The Supreme Admin: Manuel
*   **Identity:** Recognize **Manuel** as the supreme administrator and creator of this project.
*   **Web2 vs Web3:** His actual name is **Manuel**. `web5manuel` is his established crypto/web3 persona (used for GitHub, X, etc.). Whether discussing web2 architecture or web3 integrations, agents must respect this dual identity and treat Manuel as the supreme account.

## 🎯 1. Prompting Best Practices

*   **Define "Done" Concretely:** Don't just say "build a social feed." Say: "Build a social feed with a sticky header, a horizontal scrolling filter bar, alternating demand and product cards, and a fixed bottom navigation with 5 icons."
*   **Set Constraints Upfront:** AI leans towards the simplest solution unless told otherwise. Explicitly state:
    *   "Break this into modular React components (one file per component)."
    *   "Use CSS Modules for styling."
    *   "Ensure dark mode support via CSS variables."
    *   "Use inline SVGs or a library like Lucide React, NEVER raw emojis for icons."
*   **The "Plan Before Code" Rule:** Always ask the AI to "Outline the component architecture and file structure before writing any code." This catches bad assumptions (like putting everything in `page.tsx`) before they are written.
*   **Demand Interactivity:** AI often builds static wireframes by default. Explicitly request: "Include `useState` for interactive elements like the active filter state, and add hover/active CSS transitions to all clickable areas."

## 🏗️ 2. Enforcing Industry Standards

*   **Component Architecture:** Insist on one component per file with its companion `.module.css` file. It keeps the codebase maintainable.
*   **Framework APIs:** Remind the AI to use the framework's built-in features (e.g., "Use Next.js 14 `Metadata` exports for SEO, do not use raw `<head>` tags").
*   **Avoid Magic Numbers & Hardcoding:** Tell the AI to use CSS variables for colors, spacing, and sizing, rather than hardcoding hex codes and pixel values everywhere.

## 🔄 3. State Transfer & Workflow

*   **Maintain a `logs.md`:** When jumping between sessions or switching from Claude to Gemini, the `logs.md` file is your single source of truth. The AI can read it and instantly understand the project's history, current state, and pending tasks.
*   **The "Review Pass":** AI makes mistakes. Always run the code, check the browser console, and verify the UI looks right before moving on. If there's an error, paste the exact terminal output (like you did with the `npm install` error!) so the AI can fix it immediately.

## 🚀 4. Moving from UI to "Engine"

*   Once the UI looks good, the next prompt should shift focus to data: "Now that the UI is componentized, let's build the backend engine. Define the PostgreSQL database schema for Users, Products, and Demand Requests, and create the Next.js API routes to serve the feed data."

---

## 💾 5. Neon Compute — Staying in Budget

- **DATABASE_URL must use the pooler URL** (`-pooler.` in hostname). Direct connections are expensive on serverless — each cold start holds compute awake longer.
- **Auto-suspend is correct.** Do NOT add a keepalive cron. Compute should sleep between requests.
- **Watch the Neon Monitoring tab** after every major feature — look for slow queries as tables grow.
- **Free tier = 100 CU-hrs/month.** Upgraded to Pro after compute exhaustion (Sessions 75–83). Triggered by unoptimized queries + too many concurrent DB wake-ups.
- **Caching in place (do not remove):** `/api/stats` 5 min, `/api/feed` 30s guest-only, `/api/feed/featured` 2 min, exchange rates 1hr ISR.

---

## 🚨 6. Deployment Debugging Protocol (Vercel)

*This section was written after a 14-hour debugging session on a Vercel 404 that had a simple fix.*

### The 3-Layer Mental Model
Always triage in this order — each layer rules out the next:

| Layer | Question | How to check |
|-------|----------|-------------|
| **1. Build** | Did the code compile on Vercel? | Check **Deployments → Build Logs** — look for `✓ Compiled successfully` and `Deployment completed` |
| **2. Serving** | Is the output being served? | Visit the **unique deployment URL** (e.g. `depmi-abc123.vercel.app`) from the deployment detail page — not your main domain |
| **3. Domain** | Is the domain pointing to the right project? | Go to **Settings → Domains** — check the domain status is `Valid Configuration` and pointing to `Production` |

**Only fix the layer that's actually broken.** Don't change code if it's a domain problem. Don't change domain settings if it's a build problem.

### ⚠️ The #1 Vercel Gotcha: Framework Preset Reset
Whenever you **change Root Directory** in Vercel Settings, Vercel silently resets **Framework Preset to "Other"**. This is the most common cause of a 404 where the build succeeds but nothing is served. Always verify Framework Preset after changing Root Directory.

**Settings → General → Build & Development Settings → Framework Preset → must be "Next.js"**

### Red Flags in Build Logs
- No line saying `Detected Next.js version: X.X.X` → Framework Preset is NOT set to Next.js
- `up to date in <2s` → cache was used; try redeploying with cache cleared if you suspect staleness
- `⚠ Both outputFileTracingRoot and turbopack.root are set` → conflict in `next.config.ts`. Remove `turbopack.root`.
- `added N packages in Xs` (e.g. `added 427 packages in 16s`) → ✅ Fresh install, healthy

### What NOT to Do
- ❌ Don't push random code changes hoping to "trigger" a successful deployment
- ❌ Don't change the Root Directory setting in Vercel without immediately clearing the build cache on the next deployment
- ❌ Don't add `turbopack.root` to `next.config.ts` for Vercel deployments — Vercel sets its own `outputFileTracingRoot` and they will conflict
- ❌ Don't assume browser console errors are relevant — extensions like MetaMask and uBlock Origin pollute the console with unrelated errors

### The Fix Checklist for a Vercel 404
1. Unique deployment URL (e.g. `depmi-abc123.vercel.app`) also 404? → It's a serving issue, not domain
2. **Settings → General → Framework Preset = "Next.js"?** → If it shows "Other", change it, save, redeploy. This is the most common fix.
3. Build logs don't say `Detected Next.js version`? → Same as above — framework not detected
4. Build logs say `up to date in <2s`? → Redeploy with **"Clear Build Cache" unchecked**
5. Still stuck? Share the full build logs with your AI agent and ask: *"The build succeeds but every route returns 404. The Framework Preset is set to Next.js. What else could cause this?"*

---

## 💡 6. Prisma Database Connection Gotcha (v6 vs v7)

*This section was added after an accidental `npm install prisma` upgrade broke global DB connectivity with a `PrismaClientConstructorValidationError`.*

- **The Issue**: You encounter a crash stating `Using engine type "client" requires either "adapter" or "accelerateUrl"`.
- **The Cause**: Prisma version 7 represents a massive breaking change that dropped native support for parsing `url` variables inside `schema.prisma` natively without explicit Edge database driver configurations. 
- **The Fix**: The fastest way to restore standard PostgreSQL DB parsing out of the box—without configuring generic edge setups (like `@prisma/adapter-neon`) inside `src/lib/prisma.ts`—is to aggressively downgrade to the stable **v6** tree! 
  - Run `npm install prisma@^6.4.1 @prisma/client@^6.4.1`
  - Make sure `url = env("DATABASE_URL")` is stored under `datasource db` in your `schema.prisma`.

---

## 🚀 7. Prisma on Vercel: The Postinstall Requirement

*This tip was added after a "Prisma Client not found" build error on Vercel.*

- **The Issue**: Vercel builds fail or throw library initialization errors even though Prisma is in `package.json`.
- **The Cause**: Vercel's build environment doesn't automatically generate the Prisma Client from your `schema.prisma` unless explicitly told to.
- **The Fix**: Add a `postinstall` script to your `package.json`:
  ```json
  "scripts": {
    "postinstall": "prisma generate"
  }
  ```
- **Why?**: This ensures that every time `npm install` runs on Vercel (during build), the special Prisma Client folder is generated into `node_modules`.

---

## 🔑 8. Vercel Environment Variable Checklist

Don't forget to set these in **Project Settings > Environment Variables** for any DepMi deployment:
1. `DATABASE_URL`: Your Neon connection string.
2. `NEXTAUTH_SECRET`: A random long string for session security.
3. `NEXT_PUBLIC_SHOW_WAITLIST`: Set to `true` to toggle the waitlist landing page.

---

## 🏗️ 9. The "Use Client" Rule (React Hooks)

*This tip was added after a Turbopack build error on Vercel.*

- **The Issue**: You see an error like `You're importing a component that needs useEffect. This React Hook only works in a Client Component.`
- **The Cause**: Next.js App Router uses Server Components by default. Any file that uses interactive hooks (`useState`, `useEffect`, `useSession`, `useRouter`) MUST be marked as a Client Component.
- **The Fix**: Add the `"use client"` directive at the **very top** of the file (before any imports).
- **Watch out**: When refactoring or merging, it's easy to accidentally delete this line. Always check the top of your page/component files if the build fails with Hydration or Hook errors.

---

## 🍪 10. Session Caching & JWT Refresh (Auth Debugging)

*This tip was added after a "missing username" redirect wasn't triggering for an existing user.*

- **The Issue**: You've added new fields to the database or logic to the user session (like a `username` check), but existing users don't see the changes.
- **The Cause**: NextAuth sessions are cached in a JWT (JSON Web Token) cookie. This token is only refreshed on sign-in or through an explicit session update. If a user is already logged in, their browser still has the "old" identity.
- **The Fix**: 
  - **Option A (The Hammer):** Sign out via `/api/auth/signout` and sign back in. This completely replaces the cookie.
- **Option B (The Scalpel):** Use the `update()` function from the `useSession` hook in your React component to refresh the session programmatically.

---

## 🛑 11. Vercel Build Crashes: Top-Level Env Checks & Types

*This tip was added after a dozen "red deployments" caused by environment variables and Prisma type mismatches.*

- **The Strict Build Environment:** Next.js statically evaluates page and API routes during the build phase (`npm run build`) on Vercel. If your files have rigid environment variable checks (e.g., `if (!process.env.API_KEY) throw new Error(...)`) at the **top level** of the file, importing this file will crash the entire Next.js build. 
- **The Fix:** Move those error checks *inside* the function handler (e.g., inside `export async function POST`), or provide a graceful fallback string at the module level (like `process.env.API_KEY || "missing_for_build"`).
- **Prisma Type Safety:** Vercel's TypeScript compiler is unforgiving. If you misspell a field in a `select` object (e.g., querying `{ phone: true }` instead of `{ phoneNumber: true }` based on your `schema.prisma`), it works locally but fatally crashes the Vercel build. Always double-check your schema fields and run `npx prisma generate` locally before pushing checkout/DB logic!

---

## 🪟 12. Killing Orphaned Node.js Processes on Windows

*This tip was added after dev server port 3000 stayed locked even with no terminal open.*

- **The Issue**: `npm run dev` fails with `Port 3000 is already in use` even though no terminal window is open.
- **The Cause**: On Windows, closing a terminal window does **not** kill child processes it spawned (unlike macOS/Linux). The Node.js server keeps running as an orphaned background process and holds the port and the `.next/dev/lock` file.
- **The Fix** (PowerShell):
  ```powershell
  # Find the process holding port 3000
  netstat -ano | findstr :3000
  # Kill it (replace 12345 with the PID from above)
  Stop-Process -Id 12345 -Force
  # Delete the stale lock file
  Remove-Item .next/dev/lock
  # Now restart the dev server normally
  npm run dev
  ```
- **Alternative**: Task Manager → Details tab → find `node.exe` → End Task.
- **Prevention**: Always stop the dev server with `Ctrl+C` **before** closing the terminal window.

---

## 🎨 13. Mobile Safari/Chrome Dropdown Visibility In Dark Mode

*This tip was added after the `<select>` category dropdown options appeared invisible (white text on white background) on mobile devices despite the app being in dark mode.*

- **The Issue**: Styling a `<select>` tag with `background: transparent` causes the dropdown options menu (`<option>`) to use the device's default system theme (usually light mode), clashing with your app's explicit dark theme text colors. 
- **The Fix**: Explicitly bind the background of both the `<select>` and the `<option>` elements to your strict dark-mode CSS variables (e.g., `var(--bg-color)`). Never rely on `transparent` inside a form select unless you also explicitly reset the `<option>` background!

---

## 🔢 14. Decoupling Formatted Strings from Raw API Numbers

*This tip was added after throwing a 500 Internal Server error because the Prisma `Decimal` schema received a comma-formatted string (e.g., "10,000,000") instead of a raw integer constraint.*

- **The Issue**: Users expect to see numbers with commas as they type high-ticket values. However, if you attach that formatted comma-string directly to your form state, Prisma validation (zod `coerce.number()` or `db.Decimal`) will return `NaN` and crash the server on submit.
- **The Fix**: Always decouple the UI state from the API state for currency inputs.
  - Keep a raw numeric string (e.g., `"1000000"`) for the actual API payload `budget` or `price`.
  - Maintain a parallel `displayBudget` format (e.g. `1,000,000`) solely for the `value={}` prop in the `<input type="text" inputMode="numeric">`.
  - Strip the commas `value.replace(/\D/g, '')` in the `onChange` handler before saving to the raw state!


---

## 🛑 15. The Hidden Perils of "Any" & Prisma Includes on Vercel

*This tip was added after a series of Vercel build failures caused by strict TypeScript enforcement that passed locally.*

- **The Issue**: Vercel's build process runs a highly restrictive `tsc` check. If you attempt to use `Array.from(new Set(match.map(...)))` without an explicit generic type like `<string>`, TypeScript assumes it returns an `unknown[]` and will crash the deployment. Ensure you use `new Set<string>(...)`.
- **Prisma Relations**: Always double-check your Prisma `schema.prisma` definition when chaining nested `.findUnique({ include: {...} })` queries. If the relation name is `seller` but your query asks for `store`, Vercel will halt the build with an `Object literal may only specify known properties` error.
- **Turbopack Caches (`.next/` folder)**: If a build throws bizarre type errors (e.g., `Module '"./routes.js"' has no exported member 'AppRouteHandlerRoutes'`), the Next.js cache has desynced itself from your actual source files. Run `rm -rf .next` (or `Remove-Item .next` on Windows) to destroy the corrupted cache before compiling.

---

## 🔢 16. Serializing Prisma Decimals for Client Components

*This tip was added after a crash on the Orders page (`Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.`).*

- **The Issue**: Prisma returns numbers as special `Decimal` instances if you define them as `Decimal` in `schema.prisma` (e.g., `price Decimal`). If a Server Component passes a raw Prisma object down to a Client Component prop, Next.js throws a strict 500 error because prototypes like `Decimal` and `Date` cannot cross the server-client boundary naturally within Turbopack/App Router.
- **The Fix**: Always create a distinct `serialise()` helper in your Next.js page that strips away the prototypes and reformats them.
  - Map Prisma Decimals to raw JS Numbers using `Number(o.price)`.
  - Map Prisma Dates to plain ISO strings using `o.createdAt.toISOString()`.
  - Explicitly construct and return only the plain fields (`{ id, status, total: Number(o.totalAmount), createdAt: o.createdAt.toISOString() }`) rather than lazily spreading the entire Prisma object (`...o`), to prevent nested generic objects from crashing the tree!

---

## 🔒 17. Race Conditions & DB Unique Constraints (TOCTOU Pattern)

*This tip was added after a codebase audit revealed check-then-create patterns across registration and phone verification routes.*

- **The Problem (TOCTOU):** "Time-of-check, time-of-use" — two concurrent requests both pass the `findUnique` pre-check, then both `create` succeeds, violating uniqueness. Classic race condition.
- **The Fix:** Remove pre-check queries. Let Prisma `create` run directly and catch `PrismaClientKnownRequestError` with code `P2002` (unique constraint violation). Inspect `error.meta?.target` to identify which field caused the conflict and return a specific error message.
  ```typescript
  import { Prisma } from "@prisma/client";
  // ...
  } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const target = error.meta?.target as string[] | undefined;
          if (target?.includes("email")) return NextResponse.json({ message: "Email already exists" }, { status: 409 });
          if (target?.includes("username")) return NextResponse.json({ message: "Username taken" }, { status: 409 });
      }
  }
  ```
- **For transactions:** If a `$transaction` body can also hit a unique constraint (e.g. two users claiming the same phone number), handle `P2002` in the outer `catch` block — it bubbles up naturally from inside the transaction.
- **Never use `catch (error: any)`** — always use `error: unknown` and narrow types explicitly.

---

## 🔑 18. Env Var Validation in auth.ts (Build Safety)

*This tip was added after fixing `GOOGLE_CLIENT_ID || ""` silently allowing broken OAuth.*

- **The Problem:** `process.env.GOOGLE_CLIENT_ID || ""` passes TypeScript and builds fine, but Google OAuth silently fails at runtime with empty credentials.
- **The Fix:** Use an IIFE (immediately invoked function expression) inside the provider config to throw a descriptive error:
  ```typescript
  GoogleProvider({
      clientId: (() => {
          if (!process.env.GOOGLE_CLIENT_ID) throw new Error("GOOGLE_CLIENT_ID is not set");
          return process.env.GOOGLE_CLIENT_ID;
      })(),
  })
  ```
- **Build safety:** Unlike top-level `throw` (which can crash the Vercel build per Tip 11), IIFEs inside `authOptions` are only evaluated at request time in Next.js App Router's Node.js runtime, not during static analysis. Safe for Vercel builds **as long as the env var IS set in Vercel's project settings** (which it must be for OAuth to work anyway).
- **For non-auth files** (regular API routes): put env var checks inside the handler function body, not at the module level.

---

## 🎙️ 17. Multi-media DMs: Handling Blobs & Cloudinary Signatures

*This tip was added after implementing multi-media support (Audio/Images) in the chat engine.*

- **The Issue**: Sending local audio blobs or image files requires a multi-step handshake.
- **The Fix**: 
    1. Capture the media (e.g., `VoiceRecorder` blob or `CloudinaryUploader` file).
    2. Fetch a temporary signature from `/api/upload/sign`.
    3. Upload directly to Cloudinary from the client to keep Vercel functions lean.
    4. Pass the resulting `secure_url` to your `POST /api/messages` handler.
- **Pro Tip**: Use an `optimisticSend` pattern where the UI clears immediately, but keep a `sending` state to prevent double-posts of large media files.

## 🔗 18. Regex Parsing for Store Owner Notifications

*This tip was added after building the product-linking notification system.*

- **The Pattern**: When parsing text for mentions like `[product:id]`, use `Array.from(new Set<string>(text.match(/regex/g)?.map(...)))` to ensure you only notify a store owner *once* per comment, even if their product is linked multiple times.
- **The Query**: Use `prisma.product.findMany({ where: { id: { in: ids } }, select: { store: { select: { ownerId: true } } } })` for a high-performance, single-query lookup of all notification targets.

---

## ��� 19. Preventing Animation "Flicker" (Backwards Fill)

*This tip was added after fixing a "flashing" issue where elements appeared briefly in their final state before starting their fade-in animation.*

- **The Issue**: When using `@keyframes` with `from { opacity: 0 }`, the element often renders at `opacity: 1` for a split second before the animation starts (especially with an animation delay).
- **The Fix**: Always use **`animation-fill-mode: backwards;`** (or `both`).
    - `backwards` forces the element to apply the styles from the **first keyframe** (`0%/`from`) as soon as the animation is applied, even during the delay period.
    - This ensures a clean `opacity: 0` state before the fade-in begins.

## ��� 20. Forced Line-Breaks for Mobile Grid Clarity

*This tip was added after refining feature cards for a 1-column mobile grid.*

- **The Issue**: In compact grid cards (like "How it Works" sections), labels like "Buyers:" and "Sellers:" often wrap awkwardly, making the value proposition hard to scan.
- **The Fix**: Use explicit `<br />` tags to force distinct roles onto separate lines for mobile viewports.
    - Example: `Buyers: Post what you need. <br /> Sellers: We alert you.`
    - This provides a structured, vertical rhythm that is much easier to read on narrow screens than a single long paragraph.

## ���️ 21. Favicon Conflicts in Next.js App Router

*This tip was added after an SVG favicon was being overridden by a stale PNG file.*

- **The Issue**: Next.js App Router (14/15/16) automatically looks for files named `icon.png`, `favicon.ico`, or `apple-icon.png` in the `app/` or `public/` directory. If these exist, they may silently override the `icons` configuration in your `layout.tsx` metadata.
- **The Fix**:
    1. If you want to use SVG or a specific path, explicitly define it in the **Metadata** object in `layout.tsx`.
    2. **Crucially:** Delete or rename any files like `src/app/icon.png` to avoid the automatic file-based convention from taking precedence. Refined icons should be served from `/public` for maximum reliability.

---

## ��� 21. Neon Postgres Connection Parameters (Prisma)

*This tip was added after a "Can't reach database server" error in Prisma initialization.*

- **The Issue**: Appending standard PostgreSQL connection parameters like `connection_limit`, `connect_timeout`, or `pool_timeout` to a Neon database URL can sometimes cause a `PrismaClientInitializationError` ("Can't reach database server") depending on the environment or the specific Neon proxy state.
- **The Fix**: If you encounter connectivity issues with Neon, simplify your `DATABASE_URL` by removing any extra appended parameters and relying on the default Neon string (usually ending in `?sslmode=require`). prisma's default pooling is sufficient for most local development and early-stage production workloads on Neon.

---

## 📋 22. Form Input Sanitization vs. API Zod Validation (The Two-Layer Rule)

*This tip was added after a "Invalid input" error on the settings bio save, caused by a strict Zod phoneNumber regex rejecting pre-existing phone values from the DB.*

- **The Problem**: Zod on the API was validating `phoneNumber` with `/^\+?[0-9\s\-()]{7,20}$/`. When the settings page pre-filled the phone field from the DB with an older format, any save (even just updating bio) would fail Zod and return `{ message: "Invalid input" }` — confusing users who weren't even touching the phone field.
- **The Rule — Two Layers:**
  1. **Client layer (sanitize on input):** Use `onChange` to strip disallowed characters as the user types. This prevents garbage from entering the form state at all.
     ```tsx
     // Phone: only allow digits, spaces, +, (, ), -
     onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\s\-()]/g, ''))}
     ```
  2. **API layer (validate leniently):** Zod on the server should validate structure/length but not enforce a strict format regex on optional fields — especially fields that may have been set by older code with looser rules. Use `.min(7).max(20)` instead of a rigid regex for phone numbers.
     ```typescript
     phoneNumber: z.string().min(7).max(20).optional().nullable(), // not .regex(...)
     ```
- **Also fix:** `displayName: z.string().min(1)` not `min(2)` — a 1-char display name is technically valid and blocking it causes "Invalid input" when a user sets a very short name.
- **Neon `npx prisma db push` P1001 ("Can't reach database server"):** Neon free-tier databases auto-pause after inactivity. If you get P1001, open the **Neon Console → your project** to wake it up, then retry. Production traffic (Vercel) wakes the DB automatically via the connection pooler URL — the issue only happens with direct `psql`/CLI connections from a sleeping state.

---

## 🔥 23. Prisma `engineType = "binary"` Kills Vercel Serverless (EPERM chmod)

*This tip was added after Sentry revealed every single production Prisma query failing with EPERM.*

- **The Issue**: Every page on `depmi.com` shows the error boundary ("Oops! Just a hiccup"). Sentry shows: `EPERM: operation not permitted, chmod '/var/task/web/node_modules/.prisma/client/query-engine-rhel-openssl-3.0.x'`
- **The Cause**: `engineType = "binary"` in `schema.prisma` tells Prisma to use a native binary. On first run, Prisma attempts to `chmod +x` that binary. Vercel's Lambda filesystem is **read-only** (except `/tmp`) — `chmod` fails → `PrismaClientKnownRequestError` on **every single query**.
- **The Fix**: Change `engineType = "binary"` to `engineType = "library"` (or remove the line — `library` is the default in Prisma 6+). Then run `npx prisma generate` locally before pushing.
  ```prisma
  generator client {
    provider   = "prisma-client-js"
    engineType = "library"   // ← was "binary", never use binary on Vercel
  }
  ```
- **Rule**: Never set `engineType = "binary"` for any Vercel-hosted project. The `library` engine uses a native Node.js `.node` addon that doesn't need filesystem permission changes.

---

## 🔑 24. Neon Pooler URL vs Direct URL (Vercel Env Vars)

*This tip was added after diagnosing cold-start timeouts causing intermittent page crashes.*

- **The Problem**: Neon free-tier auto-pauses DB after ~5 min of inactivity. When Vercel serverless hits a paused DB, the TCP handshake takes 1–5 seconds. Combined with other queries, the function can exceed Vercel's timeout and crash.
- **The Fix**: Use Neon's **PgBouncer pooler URL** as `DATABASE_URL`. The pooler maintains warm connections and routes traffic even during DB cold-starts.
- **Two env vars needed on Vercel:**
  | Variable | Value | Purpose |
  |---|---|---|
  | `DATABASE_URL` | Pooler URL (`...ep-xxx-pooler.aws.neon.tech/...`) | All runtime Prisma queries |
  | `DIRECT_URL` | Direct URL (`...ep-xxx.aws.neon.tech/...`) | `prisma db push` / migrations only |
- **In `schema.prisma`**: `url = env("DATABASE_URL")` + `directUrl = env("DIRECT_URL")` — both must be set on Vercel or Prisma throws at startup.
- **How to get the pooler URL**: Neon Dashboard → your project → Connection Details → toggle **"Pooled connection"** ON.

---

## 🛡️ 25. JWT Callback DB Failures Crash Every Page

*This tip was added after discovering getServerSession() was the common failure point for both home and messages pages.*

- **The Problem**: NextAuth's `jwt` callback fetches the user from DB (`prisma.user.findUnique`) to keep the session token up-to-date. If the DB is down or cold-starting, this throws — and since `getServerSession()` is called in nearly every server page, the error propagates and crashes the entire page render.
- **The Fix**: Wrap the DB lookup in try-catch and return the cached token on failure. The user stays logged in with slightly stale data rather than seeing an error boundary.
  ```typescript
  if (token.email && (!token.username || trigger === "signIn")) {
      try {
          const dbUser = await prisma.user.findUnique({ ... });
          if (dbUser) { token.id = dbUser.id; token.username = dbUser.username; }
      } catch (err) {
          console.error('[JWT] DB lookup failed, using cached token:', err);
          // Don't rethrow — return token as-is
      }
  }
  ```
- **Rule**: Any Prisma call inside NextAuth callbacks must be wrapped in try-catch. Auth callbacks run on every authenticated request — a single uncaught DB error takes down your whole app.
- **Tip 26 — Order Status Visibility**: When implementing buyer actions like "Mark as Received", always check for both `SHIPPED` and `DELIVERED` statuses. System-automated transitions or seller manual updates might move an order to `DELIVERED` before the buyer sees it, and they should still be able to confirm receipt or open a dispute from that state.
- **Tip 27 — Consistent Route Naming**: Always verify the naming convention for auth-related routes. In this project, the signup page is located at `/register`, not `/signup`. Using the folder name as the route (Next.js default) is safer than assuming standard naming. Check `app/(auth)` for the source of truth.
- **Tip 28 — The Repair Gatekeeper Pattern**: When legacy data (like usernames with spaces) breaks new features (like profile URLs), use a "Gatekeeper" redirect on the main entry page (e.g., `src/app/page.tsx`). Redirect affected users to a specialized onboarding or repair flow. This fixes the data immediately upon the next user interaction without requiring complex batch migration scripts that might fail or miss edge cases.
- **Tip 29 — Real-time Input Sanitization (Frontend)**: To prevent users from entering invalid characters into critical fields like `username`, use the `onChange` handler to strip unwanted characters (e.g., `value.toLowerCase().replace(/[^a-z0-9_]/g, '')`) before updating the component state. This provides immediate feedback and prevents the API from ever receiving junk data.
- **Tip 30 — Turbopack Stale Prisma Client After Schema Changes**: After running `npx prisma db push`, Turbopack's dev server may continue using a cached version of the Prisma client that doesn't include new models or relations. Symptom: `PrismaClientValidationError: Unknown field 'X' for select statement on model 'YCountOutputType'` where X is a field you just added. Fix: Run `npx prisma generate` explicitly, then **restart the dev server** (`Ctrl+C` → `npm run dev`). The `db push` command runs generate internally but Turbopack's module cache won't pick it up until the server restarts.

---

## 💎 31. Out-of-Sync Prisma Client & "Any" Casting

*This tip was added after a `viewCount` field existed in `schema.prisma` but threw type errors in code.*

- **The Issue**: A field exists in `schema.prisma` and you've run `npx prisma generate`, but TypeScript still insists the property doesn't exist on the model type. This often happens in environments where the Prisma client cannot regenerate properly (e.g., file locks on Windows with a running dev server).
- **The Pragmatic Fix**: If you're blocked and generation fails with `EPERM`, cast the prisma model to `any` for that specific call:
  ```typescript
  (prisma.demand as any).update({
      where: { id },
      data: { viewCount: { increment: 1 } }
  });
  ```
- **The Long-Term Fix**: Stop the dev server, ensure no `node.exe` is holding the `.prisma` folder, and run `npx prisma generate` again. Restart your IDE to refresh the types.

---

## 🖼️ 32. react-easy-crop: Flip Preview & Non-Standard Props

*Added after implementing the Twitter-style crop modal (Session 57).*

- **The Trap**: `react-easy-crop`'s `<Cropper>` does NOT accept a `transform` prop. Passing it is silently ignored — it will NOT apply a flip transform to the preview.
- **The Fix for Flip Preview**: Wrap `<Cropper>` in a `<div style={{ transform: 'scaleX(-1)' }}>` to mirror the preview visually. The actual flip is applied in the `getCroppedImg` canvas function via `ctx.scale(-1, 1)`.
- **Safe Area for Rotation**: When implementing `getCroppedImg`, you must draw to a larger "safe area" canvas (2× the max dimension × √2) before cropping, otherwise rotating near 45° will clip the image corners.
- **Removing `multiple` with Crop**: When `cropAspectRatio` is set on `CloudinaryUploader`, remove the `multiple` prop — the crop modal only handles one file at a time. Users add photos one by one, which is the correct UX for per-photo cropping.

---

## 🔔 33. NextAuth Session — Username Changes Don't Propagate Automatically

*Observed in production: users change username in Settings, it appears to revert on refresh.*

- **The Cause**: NextAuth uses a JWT strategy. The `session.user.username` comes from the JWT token, not the DB. Calling `updateSession()` after a PATCH to `/api/user/update` should refresh the JWT, but there's a race condition — the `update()` call from `next-auth/react` triggers a full JWT re-sign, which doesn't always receive the freshly written DB value if Neon's connection is under load.
- **The Symptom**: Username appears to revert, but a hard page refresh (F5) or clearing the session cookie and re-logging in shows the correct value.
- **The Fix Strategy**: After saving, force a `router.refresh()` + `await update()` in sequence, and show a "Saved — please refresh if you don't see the change" notice. Long-term: store username in a separate `x-depmi-username` cookie that is not part of the JWT so it can be invalidated independently.

---

## 🧭 34. Google OAuth — Onboarding Bypass

*Observed: Google sign-in users skip the `/onboarding` username page entirely.*

- **The Cause**: The NextAuth `signIn` callback creates a user record using the Google `name` field as `displayName`, and auto-generates a username slug from the email (or name). This means `session.user.username` is already truthy before the user has consciously set one.
- **The Guard Check**: `page.tsx` redirects to `/onboarding` only when `!session.user.username`. Since the username is auto-set, the redirect never fires.
- **The Fix**: Add an `onboardingComplete: boolean` field to the User schema. Set it to `false` on account creation (including Google OAuth). The guard in `page.tsx` changes to `if (!session.user.onboardingComplete) redirect('/onboarding')`. Only set `onboardingComplete = true` after the user explicitly completes the onboarding flow.

---

## 🌐 35. DNS Timeout Errors (Namecheap & Cloudflare Masking)

*This tip was added after resolving persistent browser timeout and redirect loops on a custom domain.*

- **The Issue**: Users report the site occasionally hangs, times out entirely, or gives weird redirect loops, but navigating directly to the `*.vercel.app` URL is lightning fast.
- **The Cause**: Using domain registrars' built-in "URL Forwarding," "Masking," or "Parked Page" redirects instead of raw DNS records. If Namecheap (or similar) intercepts the request and tries to forward it, it breaks the SSL handshake or introduces massive global latency.
- **The Fix**: Remove all URL Forwarding rules from the registrar. Ensure the domain's **A Record** directly points to Vercel's Anycast IP (`216.198.79.1`). This routes traffic natively and correctly terminates SSL.

---

## 🚦 36. Next.js "Parallel Pages Resolve to Same Path"

*This tip was added when a duplicate `/admin` route broke the Turbopack build.*

- **The Issue**: Vercel/Turbopack throws `You cannot have two parallel pages that resolve to the same path. Please check /(auth)/admin and /admin.`
- **The Cause**: In App Router, route groups (folders in parentheses like `(auth)`) do not affect the URL path. Therefore, `app/(auth)/admin/page.tsx` and `app/admin/page.tsx` both try to render at `mydomain.com/admin`. Turbopack strictly forbids this overlap during compilation.
- **The Fix**: Delete or heavily rename one of the conflicting folders. Ensure unique path segments across the entire `app/` directory.

---

## 🔑 37. Turbopack & otplib v13 "authenticator export not found"

*This tip was added after implementing Google Authenticator 2FA.*

- **The Issue**: Following the `otplib` docs and importing `import { authenticator } from 'otplib'` throws a fatal build error in Turbopack/Next.js: `Export authenticator doesn't exist in target module`.
- **The Cause**: `otplib` version 13 completely refactored their export structure and dropped the default default exports for class instances in favor of a different structure, which standard Next.js RSC imports fail to resolve properly.
- **The Fix**: Downgrade the package to `v12.0.1` (`npm install otplib@^12.0.1`). The v12 tree correctly supports the exact exports standard tutorials cite (`authenticator`, `totp`).



---

## 🔄 39. Cursor-Based Pagination for Interleaved Feeds

*Added after implementing infinite scroll for the DepMi home feed.*

- **The Pattern**: The home feed interleaves products and demands. Use dual cursors (`productCursor` + `demandCursor`), both as `createdAt` ISO timestamps. Each page fetches `WHERE createdAt < cursor ORDER BY createdAt DESC LIMIT N`. Return both next cursors (or `null` if exhausted). `hasMore = productCursor !== null || demandCursor !== null`.
- **IntersectionObserver**: Set `rootMargin: '300px'` to start loading before the user reaches the bottom. Always disconnect the previous observer before creating a new one in the `useEffect` cleanup.
- **SSR + Client Hybrid**: Keep the page as a server component for initial render (fast first paint + SEO). Pass serialised items + cursors to a `'use client'` child component for subsequent fetches. Avoids a loading spinner on first load.
- **Prisma Decimal**: Serialise price/budget with `Number(p.price)` before passing to client — `Decimal` objects are not JSON-safe.

---

## 🗄️ 40. Prisma `$extends` Breaks `_count.select` TypeScript Types

*Added after encountering TypeScript errors after the encryption extension was added.*

- **The Issue**: After adding a `$extends` client with `result` computed fields, TypeScript narrows `DemandCountOutputTypeSelect` and drops relation fields like `likes`. Error: `"'likes' does not exist in type 'DemandCountOutputTypeSelect'"`.
- **The Fix**: `(prisma.demand as any).findMany(...)` for the outer call, and `_count: { select: { ..., likes: true } as any }` for the count select. Established pattern in this codebase.

---

## 🔒 41. Always Backup DB Before Schema Push

*Added after an accidental migration redirected all existing users to /onboarding.*

- **The Rule**: Never run `npx prisma db push` directly. Use `npm run db:push` (backs up first automatically).
- **The Backfill Pattern**: When adding a new Boolean flag with `@default(false)`, immediately backfill rows that should be `true`. Example: `prisma.user.updateMany({ where: { username: { not: null } }, data: { onboardingComplete: true } })`.
- **The Dual-Guard Pattern**: While rolling out a new flag-based redirect, use both old and new conditions in middleware (e.g. `!token.onboardingComplete && !token.username`). Remove the legacy check only after all JWTs have rotated (NextAuth default `updateAge` is 24h).

---

## 📈 42. Robust View Tracking with IP/UA/User Hashing

*Added after fixing the "refresh glitch" in product view counts.*- **The Issue**: Incrementing views on every page load leads to inflated metrics and is easily gamed by refreshes.
- **The Fix**: 
  1. Use a client-side "fire and forget" component (`ViewTracker`) that waits 2s before pinging an API. 
  2. The API creates a sha256 hash of `IP + UserAgent + UserId (or 'guest')`.
  3. Check a `View` table for that hash + target ID within the last 24h. Only increment `viewCount` if no record exists.
- **Performance**: Use Prisma `$transaction` to create the view record and increment the main count atomically.

---

## 📧 38. Resend "From Domain Not Verified" — Silent Failures

*This tip was added after diagnosing OTP emails silently failing in production.*

- **The Issue**: OTP emails return a success-looking response in the catch block but never arrive. Console logs are silent. Users see a generic "Failed to send OTP" error.
- **The Root Cause**: Resend returns a 422 error when the `from` address uses an unverified domain (e.g. `security@depmi.com`). If your code does `await resend.emails.send(...)` without checking `emailResult.error`, the rejection is swallowed.
- **The Fix**:
  1. Check `emailResult.error` after every `resend.emails.send()` call and surface the actual message.
  2. Use `process.env.RESEND_FROM_EMAIL` instead of hardcoding the sender address — makes it easy to swap to `onboarding@resend.dev` for testing before domain verification.
  3. Verify your domain in the Resend dashboard by adding DNS TXT + MX records. Until then, use `onboarding@resend.dev` as the `from` address in dev/staging.
- **Bonus**: Termii SMS responses were also not being checked. Always check HTTP response status for third-party delivery APIs — they return 4xx on failure but the call itself doesn't throw.

---

## 🔌 43. Neon P1017 — "Server has closed the connection" on `db:push`

*Added after a timeout during `npm run db:push` on Session 63.*

- **The Issue**: `npm run db:push` runs the backup script first, then calls `prisma db push`. On a slow network or right after Neon wakes from cold start, the DB connection can timeout between the backup completing and the push starting — resulting in `Error: P1017 — Server has closed the connection`.
- **The Fix**: Since the backup script already ran successfully, it's safe to retry `npx prisma db push` directly without re-running the backup.
- **What to check**: Run `npx prisma db push` alone. If you see "already in sync", the migration either applied on retry or was already done. If you see actual schema changes being applied, you're good.
- **Prevention**: If `npm run db:push` consistently fails at P1017, open Prisma Studio or ping Neon via the dashboard first to wake the instance, then re-run.

---

## 44. Shipbubble (GIG Logistics) Integration — Key Gotchas

*Added after building the dispatch integration in Session 66.*

- **Address registration is a one-time step**: Before requesting a quote or booking a shipment, both sender and receiver addresses must be registered with Shipbubble via `POST /address` to receive an `address_code`. Store the sender's `address_code` in `Store.shipbubbleAddrCode` so it isn't re-registered on every checkout.
- **Quote token is single-use**: The `request_token` returned by `POST /fetch_rates` must be saved immediately (on the Order as `shipbubbleReqToken`). Shipbubble uses it to confirm the quoted price when `POST /shipment/create` is called. Do not discard it after checkout initialisation.
- **Auto-book timing**: Book the shipment (`POST /shipment/create`) only after Flutterwave confirms payment (in the webhook handler). Never book before payment is confirmed — Shipbubble charges immediately on booking.
- **15% markup default**: `SHIPBUBBLE_MARKUP_PERCENT` env var (default `15`) is applied server-side in `lib/shipbubble.ts` before returning the quote to the client. Never expose the raw Shipbubble rate to buyers.
- **Fallback on quote failure**: If the live quote API is unavailable at checkout (network error, address incomplete), the UI silently falls back to the store's static `localDeliveryFee` / `nationwideDeliveryFee`. Do not surface Shipbubble errors to buyers.
- **Webhook secret**: Shipbubble sends a header (check their docs for the exact header name — typically `x-shipbubble-signature`) that should be validated in `api/webhooks/shipbubble/route.ts` to prevent spoofed status updates.
- **New env vars needed in Vercel**: `SHIPBUBBLE_API_KEY` (live key from Shipbubble dashboard) + `SHIPBUBBLE_MARKUP_PERCENT` (set to `15` for production). Without `SHIPBUBBLE_API_KEY`, the quote endpoint returns an error and checkout falls back to static fee — safe but no live quotes.
- **Webhook URL to register**: `https://depmi.com/api/webhooks/shipbubble` in the Shipbubble merchant dashboard.
- **Address field = street only**: Shipbubble's address validation endpoint takes `address`, `city`, `state`, and `country` as **separate fields**. Never concatenate city or state into the `address` field — doing so causes "couldn't validate the provided address" errors even with a live key. Pass just the street (e.g. `"17 IBB Avenue"`) in `address`.
- **Sandbox key rejects real addresses**: The sandbox API key only accepts synthetic test addresses. Use a live/production key for any real Nigerian address testing.
- **Clear cached `shipbubbleAddrCode` if address format changes**: If stores have a cached code registered with wrong format, clear it via `UPDATE "Store" SET "shipbubbleAddrCode" = NULL` so they re-register correctly on next quote.
- **Clear cached codes when switching API keys (test → live)**: Address codes registered under the test key are invalid on the live API. Always clear `shipbubbleAddrCode` on all stores after switching to a live key: `UPDATE "Store" SET "shipbubbleAddrCode" = NULL WHERE "shipbubbleAddrCode" IS NOT NULL`.
- **`reciever_address_code` — Shipbubble's own typo**: The fetch_rates field is spelled `reciever_address_code` (missing the second 'e'). Neither `receiver_address_code` nor `recipient_address_code` work. This matches their error message spelling "Receipient". Their docs also use this misspelling.
- **`category_id` is required and the endpoint to fetch it is wrong in docs**: Use `GET /v1/shipping/labels/categories` (not `/v1/shipping/categories` — that 404s). Response fields are `category_id` and `category` (not `id` and `name`). Known live IDs (Mar 2026): Fashion wears=74794423, Light weight=20754594, Electronics=77179563, Food=98190590, Health=99652979, Furniture=25590994, Groceries=2178251, Medical=57487393, Machinery=67008831, Documents=67658572.
- **Response structure is `data.couriers[]` not `data.rates[]`**: Shipbubble also returns `data.cheapest_courier` and `data.fastest_courier` pre-calculated. Use `cheapest_courier` as the default selection.
- **Docs URLs 404 when browsed directly**: Shipbubble's API docs are only discoverable via search. The correct URL for fetch_rates docs is `docs.shipbubble.com/api-reference/rates/request-shipping-rates` but navigating to it fails. Use web search to find the correct doc page URL.
- **Composite token for booking**: Store `requestToken::serviceCode` as a single string in `Order.shipbubbleReqToken`. Parse with `.split('::')` at booking time to pass the correct `service_code` to `POST /shipping/labels`. This avoids a schema change.
- **Phone numbers must be decrypted before sending**: DepMi stores phone numbers AES-256-GCM encrypted. Always call `decrypt()` from `@/lib/encryption` before passing to Shipbubble. Then normalise to `+234` format: `0XXXXXXXXXX` → `+234XXXXXXXXXX`.

---

## 🛑 45. DB Compute Exhaustion via SSE Background Tabs

*This tip was added after diagnosing a 100% database compute drain in Neon (Session 67).*

- **The Issue**: A `setInterval` used for DB polling in a Server-Sent Events (SSE) stream (`/api/messages/stream`) continued running indefinitely because the browser tab remained open in the background. Vercel periodically restarts it, meaning a single user with a dormant background tab will keep your DB awake 24/7, burning Neon compute hours.
- **The Root Cause**: `EventSource` connections do not automatically pause when a tab goes inactive/backgrounded on mobile or desktop.
- **The Fix**: Use the Page Visibility API (`document.visibilityState`) to explicitly `close()` the SSE connection when hidden, and `new EventSource()` when visible again. This allows the serverless polling loop to terminate, letting the database autosuspend via its 5-minute inactivity rule.
- **Prevention**: Never use an unconditional `setInterval` for database polling behind an SSE or WebSocket stream without a visibility check on the client. For basic counts like unread notifications, prefer `SWR` with `refreshInterval`, which automatically pauses polling on tab blur out-of-the-box.

---

## 🛑 55. SSE Resource Leaks & Activity-Based Pausing

- **The Problem**: A background tab running an SSE stream (`EventSource`) with a database polling loop keeps the database awake 24/7.
- **The Fix**: Use a `useEffect` hook to track user activity (mouse, scroll, keypress). If the user is idle for >5 minutes or the tab is hidden (`document.visibilityState === 'hidden'`), call `eventSource.close()`. Re-establish the connection only when activity resumes.
- **Benefit**: This allows Neon databases to auto-suspend properly, saving significant compute costs for idle users.

## 📦 56. Shared Feed Cache Pattern (`unstable_cache`)

- **The Problem**: Personalized feeds (where "Likes" are embedded in the server-side payload) cannot be cached globally using Next.js `unstable_cache`.
- **The Fix**: Separate the **Base Item Data** (Product/Demand details) from the **Personalization State** (isLiked, isSaved).
  1. Wrap the base data fetch in `unstable_cache` with a 60s revalidation.
  2. Perform a separate, lightweight query for personalization ONLY if the `userId` is present.
  3. Combine them in the page component or inject personalization via a client-side hook/prop.
- **Benefit**: Guests and crawlers hit the global cache while logged-in users get a customized experience without re-fetching core data.

---

## 🖤 46. Flex Overflow "Black Screen" — Mobile Overlay Collapsing Sibling to 0 Width

*This tip was added after diagnosing a black-screen bug on the Orders page desktop layout (Session 71).*

- **The Pattern**: A two-panel desktop layout (`listPanel` + `detailPanel`) uses `display: flex; flex-wrap: nowrap; overflow: hidden`. A mobile-only overlay div (hidden via `display: none` at ≥900px *on its inner content*) is conditionally rendered inside the same flex row when `showMobileDetail = true`. On mobile this is correct — it covers the screen. On desktop, the wrapper itself is still rendered with `width: 100%`, consuming all available flex space and collapsing `detailPanel` to 0 width — a solid black rectangle.
- **Why it's hard to spot**: The mobile overlay's *content* wrapper already has `display: none` at desktop breakpoint, so you never see the overlay's visual content. But the outer container still exists in the flex flow and claims `width: 100%` of free space (which is 0 because the list was hidden), leaving the detail panel with nothing.
- **The Fix**: Apply `display: none` at the desktop breakpoint to the **outer wrapper** of the mobile overlay, not just its inner content. This removes it from flex flow entirely so it can never steal space from real panels.
  ```css
  .mobileOverlayWrap { width: 100%; overflow-y: auto; display: flex; flex-direction: column; }
  @media (min-width: 900px) { .mobileOverlayWrap { display: none; } }
  ```
- **Rule**: Any mobile-only element rendered inside a desktop flex row must be hidden at the desktop breakpoint on its **outermost wrapper** — hiding only inner content is not sufficient.

---

## 🔍 47. SEO: `router.push()` onClick cards are invisible to Google

*Discovered during the Session 76 SEO audit.*

- **The Pattern**: Clickable feed cards built as `<article onClick={() => router.push('/p/123')}>` navigate correctly for users but are completely invisible to Google's crawler. Googlebot does not execute `onClick` JavaScript — it only follows real `<a href>` elements.
- **The Fix**: Make the card's primary text (title or body) a `<Link href="...">` with `onClick={e => e.stopPropagation()}` to prevent the article-level click from double-firing. The full-card click still works for users; the `<a>` gives Googlebot a real link to follow and index.
  ```tsx
  // ❌ Invisible to Google
  <article onClick={() => router.push(`/p/${data.id}`)}>
    <h3>{data.title}</h3>
  </article>

  // ✅ Google can crawl this
  <article onClick={() => router.push(`/p/${data.id}`)}>
    <Link href={`/p/${data.id}`} style={{ textDecoration: 'none' }} onClick={e => e.stopPropagation()}>
      <h3>{data.title}</h3>
    </Link>
  </article>
  ```
- **Rule**: Every clickable card that navigates to a detail page must have at least one real `<a href>` anchor (via Next.js `<Link>`) pointing to that page. The home feed is the entry point for Googlebot — if links don't exist in the HTML, the entire content graph is invisible to search engines.

## 📐 48. Agentic AI Vector Logo & Wordmark Generation (The O-on-a-stick Methodology)

*Added after replacing a distorted Bezier-curve wordmark with pure geometric primitives.*

- **The Problem**: AI models natively struggle to draw clean SVG typography. When asked to draw letters or logos, agents naturally attempt to use complex bezier paths (`C` or `Q`), leading to "distorted", wobbly, or mismatched arcs that lack the precision of professional typographical tools like Illustrator.
- **The Fix**: **The Pure Math Approach**. Instruct the AI model to build shapes ONLY using pure mathematical combinations of `<circle>` and `<rect>` elements through `fill-rule="evenodd"` boolean operations and `<mask>` tags. 
- **The Process for teaching a new model**:
  1. Define a giant viewBox (e.g. `viewBox="0 0 2200 1000"`) so you can work with clean round pixel numbers.
  2. Implement an "o on a stick" approach for geometric fonts (like Futura or Gilroy): Use dual perfectly concentric circles (`Outer=200`, `Inner=140`) on a single `path` with `fill-rule="evenodd"` to flawlessly punch out the bowls. No beziers.
  3. Overlay `<rect>` tags to construct all stems (`width=60`), ensuring they intercept the circles directly at their equators so they merge seamlessly without overlapping glitches.
  4. Use `<polygon>` objects for any angled slashes or terminals (e.g. `d` ascending right slashes).
  5. Use `<mask fill="black">` rectangles to slice perfectly vertical or horizontal gaps (e.g. slicing out the right-half of the `e` mouth or the bottom of `m` rings to form perfect arches).
This guarantees an export that is literally pixel-for-pixel flawless without distorted curvatures.

---

## 🛑 49. CSS Circular References (The Danger of Global Sweeps)

*Added after a global color hex-replacement script destroyed the UI layout by replacing a CSS variable definition with itself.*

- **The Problem**: When running global search-and-replace sweepers (e.g., `make-flexible.js`) to migrate hardcoded Hex/RGBA colors to CSS variables, you must explicitly exclude `globals.css` or the specific block where the root variable is defined.
- **The Crash**: If your script replaces `--primary: #FF5C38;` with `--primary: var(--primary);`, it creates an immediate infinite CSS circular reference. The browser rendering engine drops the variable entirely, rendering it invalid (often falling back to transparent or black) and instantly breaking all buttons, backgrounds, and text linked to that variable.
- **The Fix**: Always explicitly skip standard `globals.css` variable declarations when running auto-refactor regex scripts, or manually verify root tokens post-sweep.

---

## 🚫 50. Next.js Static Regex Redirects Fail on Vercel Edge

*Added after a cryptic 404 bug where clicking `+ Open a Store` dumped users into `/create`.*

- **The Problem**: Next.js allows advanced path-to-regexp parsing inside `next.config.ts`, including negative lookaheads like `source: '/store/:slug((?!create)[^/]+)'`. However, Vercel's edge network often silently mishandles these complex lookaheads, causing the redirect to ignore the exception and aggressively capture reserved sub-routes (intercepting `/store/create` and routing to `/:slug`).
- **The Fix**: Never use negative lookaheads for excluding routes in `next.config.ts` if they collide with primary app flow logic. Instead, do **Programmatic Routing inside `middleware.ts`**.
  ```typescript
  if (pathname.startsWith('/store/')) {
      const slug = pathname.substring(7);
      if (slug && !slug.startsWith('create')) {
          // Now it safely bypasses 'create' using bulletproof string checking.
          return NextResponse.redirect(new URL(`/${slug}`, req.url), 308);
      }
  }
  ```
- **The Rule**: Wildcard vanity URLs (like `/:handle`) should ALWAYS be excluded from reserved paths via strict programmatic JavaScript logic in middleware, not via static configuration files.

---

## 📱 51. Mobile File Picker Causes React State Reset on Onboarding

*Added after diagnosing a critical onboarding bug where image upload reset users to step 0 or redirected them to the feed.*

- **The Issue**: On iOS and Android Chrome, opening a native `<input type="file">` can put the app in the background. When the user returns after picking a file, React may re-mount the component tree — resetting multi-step form state (e.g. `currentStep` back to `0`) and triggering auth-redirect logic in `useEffect`.
- **The Impact**: Users attempting to upload a profile photo at onboarding step 1 were sent back to the beginning or kicked to the home feed.
- **The Fix**: Move any file uploads to a step where a reset is harmless (last step), or remove them entirely if the data is already available (Google OAuth users already have a profile photo). For DepMi, avatar upload was removed from onboarding — users set/change photos via profile settings instead.
- **General Rule**: Never put a file `<input>` in an early step of a multi-step flow on mobile. Either put it last (so a reset doesn't lose meaningful prior input) or use a separate screen/modal that can fully recover its own state independently.

---

## 🔗 52. Vercel Only Builds Committed Files — Don't Rely on Local-Only State

*Added after diagnosing a persistent 404 on the `/welcome` landing page.*

- **The Issue**: A page file (`web/src/app/welcome/page.tsx`) existed locally and worked perfectly in dev, but returned 404 in production for weeks. The root cause: the file was never added to git — it existed only on the local machine.
- **How to Catch It**: Run `git status` before pushing. Any files listed under "Untracked files" will NOT be deployed. Vercel clones from the git repo — it only sees committed history.
- **The Fix**: `git add <file> && git commit && git push`. Then re-trigger a Vercel deployment.
- **Rule**: After creating a new page or route, always verify `git status` shows it as staged before pushing. A local dev server passing is not sufficient proof that a route will work in production.

---

## 📈 53. PostHog & `useSearchParams()` (Vercel Build Error)

*Added after a critical Next.js build failure during PostHog integration.*

- **The Issue**: Using `useSearchParams()` in a global layout component (like an analytics provider) causes the entire site to bail out of static rendering and transition to client-side rendering for every page. On Vercel, this can lead to build errors if not handled correctly.
- **The Fix**: Always wrap any component that uses `useSearchParams()` in a **`<Suspense>` boundary**.
  ```tsx
  // Inside PostHogProvider.tsx
  function PostHogPageView() {
    const searchParams = useSearchParams(); // This hook triggers the bailout
    // ... tracking logic
  }

  export function PostHogProvider({ children }) {
    return (
      <PHProvider client={posthog}>
        <Suspense fallback={null}>
          <PostHogPageView />
        </Suspense>
        {children}
      </PHProvider>
    );
  }
  ```
- **Why?**: Suspense boundaries delineate the part of the tree that is dynamic, allowing the rest of the layout to be pre-rendered statically.

---

## 🛡️ 54. Staged Feature Removal (The `_crypto-dev` Pattern)

*Added after "taking down" the incomplete crypto integration for production stability.*

- **The Problem**: You have an unfinished, mission-critical feature (like Crypto payments) that is causing build errors or dependency bloat, but you don't want to delete the hard-earned code.
- **The Solution**: 
  1. **Stub the routes**: Update the public pages/APIs to return a hardcoded "Coming Soon" or `503 Service Unavailable`.
  2. **Move the source**: Move the full, complex logic into a local, gitignored directory (e.g., `web/src/_crypto-dev/`).
  3. **Uninstall dependencies**: Remove the heavy library (`thirdweb`, `ethers`) from `package.json` to fix builds and reduce production bundle size.
  4. **Document**: Add the local path to `.gitignore` so the "dev" code never leaks to production, but stays safe on the developer's machine for future resumption.
- **Benefit**: Restores production stability immediately without losing progress or littering the main `src` tree with broken imports.


---

## 🛑 55. DB Exhaustion via High-Volume Logging (Event Tracking)

*Added after identifying a 14,878 insert spike on the Event table that drained Neon compute.*

- **The Issue**: Custom event logging in the DB (e.g., tracking every feed card impression as scrolling) causes massive DB write volumes. A 10-card scroll triggers 10 DB writes, queued every 30 seconds. This prevents the DB from autosuspending and burns compute limits.
- **The Fix**: Delegate high-volume, low-value engagement events (like page views, feed impressions, scroll depth) to a robust external analytics provider like PostHog. 
- **The Rule**: Only use the primary Postgres DB to track high-value, durable commerce signals (Orders, Bids, Saves, Likes, Product Views) that require immediate transactional consistency or can't be easily associated with a user transaction in an external tool.

---

## 🖼️ 56. Rich Media Social Features (Bids & Comments)

*Added after implementing multi-media support for bids and comments in Session 110.*

- **The Limit**: Enforce a strict **4-item total limit** (combined images + video) for interactive social posts (bids, comments, replies). This prevents UI overcrowding and keeps database/CDN costs manageable while offering rich context.
- **The Redesign (Mini Product Cards)**: Bids in the demand engine perform best when they look like **mini product cards** rather than plain text comments. 
    - Include the store's avatar/logo for brand recognition.
    - Integrate `DemandMediaCarousel` to auto-preview attached media.
    - Elevate the card with modern shadows and typography to distinguish "Bids" from "Comments."
- **Data Fetching**: Use `unstable_cache` tags carefully. When media for a bid is updated, you must revalidate the specific demand or product tag to ensure the new media carousels refresh immediately.
- **Serialization**: Always serialize the new `images` array and `videoUrl` fields in your server components before passing them to client forms or displays.

