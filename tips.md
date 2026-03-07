# AI Prompting & Workflow Tips: The "Agentic" Guide

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

## 🚨 5. Deployment Debugging Protocol (Vercel)

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
