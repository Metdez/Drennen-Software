# AGENTS.md — Project Bible
# Drennen MGMT 305 — Guest Speaker Question Sheet Generator

> This file is identical to CLAUDE.md and GEMINI.md.
> Read this file FIRST before reading anything else. Every agent, every wave, every session.

---

## MANDATORY READ ORDER

Before writing a single line of code, read these files in this exact sequence:

1. **This file** (AGENTS.md) — understand the project
2. **STRUCTURE.md** — know where every file lives
3. **ERRORS.md** — know every mistake that has already been made
4. **SCHEMA.md** — know the database shape
5. **API.md** — know every route and its contract
6. **TYPES.md** — know every shared TypeScript interface
7. **ENV.md** — know every environment variable by name
8. **Your assigned AGENT-*.md file** — know your specific job

Do not skip steps. Do not reorder steps. The order exists to prevent mistakes.

---

## WHAT THIS APP DOES (one paragraph)

A private web application for university professors that automates turning a bulk Canvas ZIP download of student-submitted questions into a polished, print-ready interview question sheet for a guest speaker series. The professor logs in, types a speaker name, drops a ZIP file, hits Generate, and downloads a formatted PDF or Word doc. That is the entire product. Nothing else.

---

## WHO USES IT

One type of user: a professor. They are not technical. They will never see config, settings, prompts, or API keys. The only inputs they ever provide are: (1) guest speaker name, (2) ZIP file. Everything else is invisible.

---

## TECH STACK (canonical, do not deviate)

| Layer | Technology | Notes |
|---|---|---|
| Frontend + Backend | Next.js 14 (App Router) | TypeScript strict mode |
| Auth + Database | Supabase | Google OAuth + email/password |
| Hosting | Vercel | Auto-deploy from main branch |
| AI | xAI Grok API | Server-side only, key never touches browser |
| File parsing | Server-side only | unzipper, pdf-parse, mammoth |
| PDF export | @react-pdf/renderer | Server-side rendering |
| Word export | docx (npm) | Buffer returned to client |
| Styling | Tailwind CSS | Custom brand tokens |

---

## BRAND (use these exact values everywhere)

```css
--brand-orange: #f36f21;   /* primary — buttons, CTAs, active states */
--brand-purple: #542785;   /* secondary — headers, accents */
--brand-green:  #0f6b37;   /* accent — success states, badges */
```

App name displayed to users: **Drennen MGMT 305**

---

## CODING RULES (non-negotiable)

1. **TypeScript strict mode**. No `any`. No `@ts-ignore`. If you don't know the type, look it up in TYPES.md.
2. **Named exports only**. No default exports except Next.js page components (which require them).
3. **No inline environment variables**. Every `process.env.X` must reference a variable defined in ENV.md.
4. **Server components by default**. Only add `"use client"` when the component genuinely needs browser APIs or React state.
5. **No file outside STRUCTURE.md**. Do not create a file that isn't listed in STRUCTURE.md. If you need a file that isn't there, stop and re-read your task — you're going out of scope.
6. **No duplicate type definitions**. If a type exists in `types/`, import it. Do not redefine it locally.
7. **Error handling on every async function**. Use try/catch. Return typed error objects, never throw to the client.
8. **Comments only for why, never for what**. The code says what. Comments say why it's done this way.
9. **No hardcoded strings for routes**. Use the route constants defined in `lib/constants.ts`.
10. **AI key is server-side only**. It lives in `lib/ai/client.ts` behind a server-only import. If you find yourself importing it anywhere else, you are wrong.

---

## FOLDER STRUCTURE REFERENCE (brief)

See STRUCTURE.md for the full annotated tree. The top-level shape is:

```
/app              → Next.js App Router pages and API routes
/components       → Reusable UI components (no business logic)
/lib              → All business logic, organized by domain
  /lib/ai         → xAI client and prompt management
  /lib/db         → Supabase query functions
  /lib/export     → PDF and Word generation
  /lib/parse      → ZIP extraction, PDF parsing, DOCX parsing
  /lib/supabase   → Supabase client helpers (client + server)
/types            → All shared TypeScript interfaces and enums
/docs             → All planning MD files (you are here)
```

---

## NAVIGATION INDEX — which file answers which question

| Question | File to read |
|---|---|
| What tables exist in the database? | SCHEMA.md |
| What are the column names and types? | SCHEMA.md |
| What API routes exist? | API.md |
| What does a route accept / return? | API.md |
| What are the environment variable names? | ENV.md |
| What TypeScript interfaces are shared? | TYPES.md |
| What does the AI system prompt say? | PROMPT.md |
| Where does a specific file live? | STRUCTURE.md |
| Why was a technology chosen? | DECISIONS.md |
| What errors have already been made + fixed? | ERRORS.md |
| What is my specific job as an agent? | AGENT-[NAME].md |

---

## V1 DO NOT BUILD LIST

These are explicitly out of scope. Do not build them, do not scaffold them, do not leave TODOs for them.

- Student-facing interface of any kind
- Direct Canvas API integration
- Professor ability to edit the system prompt
- Roles or permissions beyond basic auth
- Payment, billing, or subscription logic
- Admin dashboard
- Email notifications
- File storage (files are processed in memory, never persisted to disk)

---

## WHAT HAPPENS WHEN YOU FINISH

When your task is complete:
1. Run `npx tsc --noEmit` — fix every error before considering yourself done
2. Write a short completion report listing every file you created or modified
3. If you had to fix something unexpected, note it — it may need to go in ERRORS.md
