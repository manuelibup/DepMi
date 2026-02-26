# AI Prompting & Workflow Tips: The "Agentic" Guide

Working with AI coding agents (like me or Claude) requires a specific approach to get production-ready results efficiently. Here are the top tips and tricks to get the best out of us:

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

### Red Flags in Build Logs
- `up to date in <2s` or `up to date in 923ms` → **cache was used, not a fresh install.** If followed by 404, try redeploying with cache cleared.
- `⚠ Both outputFileTracingRoot and turbopack.root are set` → **conflict in next.config.ts.** Remove `turbopack.root`.
- `added N packages in Xs` (e.g. `added 427 packages in 16s`) → ✅ Fresh install, this is healthy.

### What NOT to Do
- ❌ Don't push random code changes hoping to "trigger" a successful deployment
- ❌ Don't change the Root Directory setting in Vercel without immediately clearing the build cache on the next deployment
- ❌ Don't add `turbopack.root` to `next.config.ts` for Vercel deployments — Vercel sets its own `outputFileTracingRoot` and they will conflict
- ❌ Don't assume browser console errors are relevant — extensions like MetaMask and uBlock Origin pollute the console with unrelated errors

### The Fix Checklist for a Vercel 404
1. Build logs show `Deployment completed`? → Move to step 2
2. Unique deployment URL also 404? → It's a serving issue, not domain
3. Build logs show `up to date in <2s`? → **Redeploy with "Clear Build Cache" unchecked**
4. Framework Preset set to "Next.js" in Settings → General? → If not, fix it and redeploy
5. Still stuck? Paste the full build logs to your AI agent and ask specifically: "Why is Vercel returning 404 after a successful build?"

