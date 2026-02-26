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
