---
description: Always update project documentation (logs.md, tips.md, agent.md) at the end of every session
---

# Documentation Update Workflow

## When to Run
**ALWAYS.** At the end of every coding session — before your final message or notify_user call — run this workflow. Manuel should never have to ask you to update docs.

## Files to Update

### 1. `logs.md` (Project Root)
- Append a new **Session entry** with:
  - Session number, date, time range (WAT timezone)
  - Agent name + Human name
  - What was done (bullet points, grouped by area)
  - Validations run (build, prisma validate, tests)
  - Any issues encountered and how they were resolved
- **Format:** Follow the existing session format in the file.

### 2. `tips.md` (Project Root)
- Only update if you learned something new during the session that would help Manuel or future agents.
- Examples: deployment gotchas, new patterns, debugging techniques.
- **Don't repeat** what's already there.

### 3. `agent.md` (Project Root)
- Only update if the **architecture, features, or roadmap changed**.
- Examples: new models added to schema, new auth methods, changed KYC requirements.
- **Don't update** for minor bug fixes or styling changes.

## How to Run
// turbo
1. Read the current `logs.md` to see the last session number
// turbo
2. Append your new session entry to `logs.md`
// turbo
3. Check if `tips.md` needs a new section (skip if nothing new learned)
// turbo
4. Check if `agent.md` needs updating (skip if no architectural changes)
// turbo
5. Commit all changed docs with message: `docs: update session logs and project docs`
