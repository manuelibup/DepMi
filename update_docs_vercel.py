logs_content = """---

## Session 46 — Mar 6, 2026 — Vercel Build & Strict TypeScript Fixes
**Agent:** Antigravity
**Human:** Manuel

### What was done:
- **TypeScript Strictness Errors:** Explicitly mapped the `unknown` generic array type of the `Set` in the API comment routes to resolve implicit any errors (`@mentions`). 
- **Database Schema Relation Fix:** Corrected the Prisma query `include` in the `/api/orders/[id]` routes (`ship`, `dispute`, `confirm`). The query was incorrectly passing `store` as the nested object when the `schema.prisma` defined the relation key as `seller`.
- **String Enum Mismatches:** Fixed the `SYSTEM_ALERT` enum string in the notifications UI rendering switch case to match the correct `SYSTEM` enum defined in the Prisma schema.
- **Object Property Typos:** Fixed an incorrect iteration over `n.read` in the Notifications view logic, modifying it to match the Prisma schema boolean property `n.isRead`.
- **Nullable Props:** Updated the `ChatClient.tsx` UI to accept `string | null` for target usernames, preventing crash-outs if a user navigates to the DM view before configuring a username handle.
- **Turbopack Caching Issue:** Diagnosed a `Module '"./routes.js"' has no exported member` bug caused by Next.js Turbopack caching old types. Wiped the `.next` directory to force a clean build.

### Outcome:
All Vercel deployment blockers have been resolved. `npm run build` exits smoothly and `npx tsc --noEmit` returns zero errors.
"""

tips_content = """

---

## 🛑 15. The Hidden Perils of "Any" & Prisma Includes on Vercel

*This tip was added after a series of Vercel build failures caused by strict TypeScript enforcement that passed locally.*

- **The Issue**: Vercel's build process runs a highly restrictive `tsc` check. If you attempt to use `Array.from(new Set(match.map(...)))` without an explicit generic type like `<string>`, TypeScript assumes it returns an `unknown[]` and will crash the deployment. Ensure you use `new Set<string>(...)`.
- **Prisma Relations**: Always double-check your Prisma `schema.prisma` definition when chaining nested `.findUnique({ include: {...} })` queries. If the relation name is `seller` but your query asks for `store`, Vercel will halt the build with an `Object literal may only specify known properties` error.
- **Turbopack Caches (`.next/` folder)**: If a build throws bizarre type errors (e.g., `Module '"./routes.js"' has no exported member 'AppRouteHandlerRoutes'`), the Next.js cache has desynced itself from your actual source files. Run `rm -rf .next` (or `Remove-Item .next` on Windows) to destroy the corrupted cache before compiling.
"""

with open("c:\\Users\\web5Manuel\\OneDrive\\Documents\\DepMi\\logs.md", "a", encoding="utf-8") as f:
    f.write(logs_content)

with open("c:\\Users\\web5Manuel\\OneDrive\\Documents\\DepMi\\tips.md", "a", encoding="utf-8") as f:
    f.write(tips_content)
