---
last_mapped_commit: 61012611b3bbfe57df4d8eb25c37b98b17a2d673
last_mapped_at: 2026-11-18
---
# Coding Conventions

**Analysis Date:** 2026-11-18

## Naming Patterns

**Files:**
- Route handlers are always `route.ts` inside App Router folders: `app/api/sessions/[id]/route.ts`, `app/api/roster/[studentName]/notes/route.ts`.
- Pages are always `page.tsx` / `layout.tsx`: `app/(app)/roster/[studentName]/page.tsx`.
- React components are PascalCase `.tsx`, one component per file: `components/ui/Button.tsx`, `components/analytics/ThemeExplorer.tsx`, `components/subscription/PaywallModal.tsx`.
- `lib/db/` modules are camelCase, one file per domain entity: `lib/db/studentProfiles.ts`, `lib/db/classInsights.ts`, `lib/db/portfolioShares.ts`.
- `lib/ai/` agents are camelCase and named for the job: `lib/ai/analysisAgent.ts`, `lib/ai/tierClassifier.ts`, `lib/ai/sqlAgent.ts`. Note one exception: `lib/ai/prompt.ts` and `lib/ai/client.ts` are plain nouns.
- `lib/export/` and `lib/parse/` use camelCase names with a format suffix when needed: `lib/export/briefPdf.ts`, `lib/export/reportDocx.ts`, `lib/parse/parseThemes.ts`.
- `types/` files are snake_case, one domain per file: `types/student_submission.ts`, `types/speaker_portal.ts`, `types/session_synthesis.ts`. This differs from `lib/` (camelCase). Do not "fix" it when adding a type file; match the snake_case pattern.
- Each directory with local rules has a `CLAUDE.md` (for example `lib/db/CLAUDE.md`, `app/api/CLAUDE.md`, `components/CLAUDE.md`). Read the nested file before editing that directory.

**Functions:**
- Exported functions are declared with the `function` keyword, not `const x = () =>`. Of the exported functions counted in `*.ts`/`*.tsx`, about 327 use `export function`/`export async function` and zero use `export const name = (`.
  ```ts
  // lib/db/semesters.ts style
  export async function getActiveSemester(...) { ... }
  ```
- Next.js route handlers are exported as HTTP-verb functions: `export async function GET(request, { params })`, `export async function POST(...)`, `export async function PATCH(...)`.
- Hooks are exported as named functions: `usePortfolio` (`components/portfolio/PortfolioContext.tsx`), `useSemesterContext`, `useSubscription`.
- Private helpers are unexported `function` declarations placed above or below their caller. In `lib/db/semesters.ts` the row mapper `rowToSemester()` is private and used only inside that module.
- Row-to-domain mappers are named `rowTo<Entity>` (`rowToSemester`, `rowToSessionSummary` in `lib/utils/transforms.ts`).

**Variables:**
- camelCase for locals and props. Database rows use snake_case (`row.user_id`, `row.created_at`) and must be mapped to camelCase before leaving `lib/db/` (see Data Shapes below).
- Module-level singletons are `let x: T | null = null` with a `getX()` lazy accessor: `getOpenRouter()` in `lib/ai/geminiClient.ts`, `getStripe()` in `lib/stripe/index.ts`.
- Constants: `UPPER_SNAKE_CASE` for true constants (`DEFAULT_MODEL`, `OPENROUTER_FAST` in `lib/ai/geminiClient.ts`, `BRAND`, `ROUTES`, `AI_CONFIG` in `lib/constants/`). Brand colors are on the `BRAND` object: `BRAND.ORANGE`, `BRAND.PURPLE`, `BRAND.GREEN`.

**Types:**
- Domain types are PascalCase `interface` or `type`, exported from `types/` and re-exported through `types/index.ts`: `Semester`, `SessionSummary`, `CreateSemesterInput`, `UpdateSemesterInput`.
- Database row types are suffixed `Row`: `SemesterRow`, `SessionRow`. They are declared in `types/` next to the domain type.
- Input shapes are suffixed `Input` (`CreateSemesterInput`). Props interfaces are named `<Component>Props` or a local `interface Props`.
- Component prop interfaces are local and not exported unless shared: `interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>` in `components/ui/Button.tsx`.

## Code Style

**Formatting:**
- No Prettier or Biome config is committed. Formatting is by convention and editor.
- Semicolons are omitted. Only about 101 lines in the tracked `*.ts`/`*.tsx` source end with `;`. Write new code without trailing semicolons, matching `lib/db/semesters.ts` and `app/api/sessions/[id]/route.ts`.
- Single quotes for strings and imports (about 793 single-quoted import lines vs 6 double-quoted). Template literals only when interpolating.
- Two-space indentation. Trailing commas are used in multi-line objects and parameter lists.
- Multi-line function signatures put each parameter on its own line:
  ```ts
  export async function GET(
    _request: Request,
    { params }: { params: { id: string } }
  ) {
  ```
- Arrow functions are used for inline callbacks: `.map(word => ...)`, `.catch(e => console.error(...))`. Parentheses are dropped around a single parameter in callbacks.

**Linting:**
- ESLint via `.eslintrc.json` extends `next/core-web-vitals` only. There is no custom rule set.
- `npm run lint` runs `next lint`. `npm run type-check` runs `tsc --noEmit`. Both are the required checks before reporting work done (see `CLAUDE.md` Working Style).
- TypeScript is `strict: true` (`tsconfig.json`). Avoid `any`. The codebase has about 15 `any` uses, mostly in `lib/db/portfolioShares.ts`, `lib/db/themes.ts`, `lib/ai/studentProfile.ts`, and `app/(app)/analytics/theme/page.tsx`. Do not add more; type the row or use `unknown` and narrow.
- Zero `eslint-disable` or `@ts-ignore` / `@ts-expect-error` directives appear in tracked source. Keep it that way; fix the type instead.

**Path alias:**
- `@/` maps to the repo root (`tsconfig.json` `paths`). Use `@/lib/db/sessions`, `@/types`, `@/lib/constants`, never relative `../../` paths across directories.

## Import Organization

**Order (observed in route and db files):**
1. Framework and third-party packages: `import { NextResponse } from 'next/server'`, `import OpenAI from 'openai'`, `import { toast } from 'sonner'`
2. Internal `@/lib/*` modules: `import { getCurrentUser } from '@/lib/db/users'`
3. Internal `@/types` and `@/lib/constants`: `import type { Semester } from '@/types'`
4. Relative imports, which are rare and used only for same-folder files (`./routes`, `./brand` inside `lib/constants/index.ts`)

**Barrels and required import sources:**
- Types: always import from `@/types`. Every file under `types/` must be re-exported in `types/index.ts`. Do not import `@/types/session` directly.
- Constants: always import from `@/lib/constants`, never `@/lib/constants/routes` or `@/lib/constants/brand` (`lib/constants/index.ts` documents this).
  ```ts
  import { ROUTES, BRAND } from '@/lib/constants'
  ```
- Use `import type` for type-only imports, as in `lib/db/semesters.ts`.
- DB functions: import named functions from the specific `lib/db/<entity>.ts` file. There is no `lib/db/index.ts` barrel.

**Path Aliases:**
- `@/*` only. No other aliases are configured.

## Error Handling

**API routes (`app/api/**`):**
- Every route authenticates first with `getCurrentUser()` from `lib/db/users.ts` and returns `401` when it is null:
  ```ts
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  ```
- Ownership checks return `404`, not `403`, so the existence of another user's resource is not leaked (`app/api/sessions/[id]/route.ts`).
- Status code meanings used consistently: `400` missing or invalid input, `401` unauthenticated, `403` authenticated but gated (subscription), `404` not found or not owned, `422` semantic failure (prompt too short, limit reached), `500` unexpected error. Source: `app/api/CLAUDE.md`.
- The standard catch block logs with a bracketed route prefix and returns `{ error: message }`:
  ```ts
  } catch (err) {
    console.error('[/api/sessions/[id]]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
  ```
- Any route that calls an AI provider must pass the error through `extractErrorMessage()` from `lib/utils/errors.ts` instead of `err.message`. This strips raw provider JSON envelopes and maps 429 / `RESOURCE_EXHAUSTED` to a friendly message:
  ```ts
  import { extractErrorMessage } from '@/lib/utils/errors'
  // ...
  } catch (err) {
    return NextResponse.json({ error: extractErrorMessage(err) }, { status: 500 })
  }
  ```
- Log prefix convention in `console.error`: `'[/api/<path>]'` for routes, `'[<name>]'` for jobs (`'[student-debriefs]'`). About 121 `console.error` calls exist in tracked `*.ts`/`*.tsx`.

**DB layer (`lib/db/**`):**
- Errors from Supabase are converted to throws with context: `if (error) throw new Error(...)`. Functions do not return `{ error }` objects.
- Read-not-found is returned as `null` (`getSessionById` resolves to `null`), and the route turns that into 404.
- Guard empty input before `.in()`: `if (ids.length === 0) return []` (`lib/db/CLAUDE.md`).

**Client components:**
- Never use `alert()`. Six files currently call `alert(`: `components/layout/AuthForm.tsx`, `components/session/DownloadButtons.tsx`, `components/speaker/GenerateBriefButton.tsx`, `components/speaker/SpeakerAnalysisUploadZone.tsx`, `components/speaker/StudentDebriefUploadZone.tsx`, `components/subscription/PaywallModal.tsx`. These are legacy. Do not add new ones.
- Use both layers together: an inline `error` state rendered in the component (about 36 files use `setError`) and `toast.error()` from `sonner` for transient async failures (about 7 files use `toast.`).

**Fire-and-forget background jobs:**
- Background AI jobs started from a route are not awaited. They attach a `.catch` that logs as non-fatal:
  ```ts
  generateClassInsights(user.id).catch(e =>
    console.error('[/api/process] generateClassInsights failed (non-fatal):', e)
  )
  ```
  Source: `app/api/CLAUDE.md`.

## Logging

**Framework:** `console` only. No logging library is in `package.json`.

**Patterns:**
- `console.error` for caught failures, with the bracketed prefix described above.
- `console.log` is rare (about 11 occurrences). Do not add debug logging to committed code.
- Never log secrets, API keys, Stripe payloads, or full prompt text.

## Comments

**File header (required):** Almost every source file opens with a JSDoc block using `@file` and a short description, followed by its Auth / DB calls / AI calls section for routes. Examples: `app/api/sessions/[id]/route.ts`, `lib/db/semesters.ts` (lists tables touched and "Called by:"), `lib/utils/errors.ts`.

**Component header (required by `components/CLAUDE.md`):** every component file has a comment right after `'use client'`:
```ts
'use client'

/**
 * MyComponent — one-line description.
 *
 * Rendered by: app/(app)/some-page/page.tsx
 * Calls: GET /api/some-route, POST /api/other-route
 * Reads: SemesterContext
 */
```

**Inline comments:** Explain *why*, not *what*. Required for optimistic UI updates (label and describe the revert), `sessionStorage`/`localStorage` keys, context reads that change rendering, and guard clauses that hide a section.

**JSDoc/TSDoc:**
- Exported functions and `interface Props` get JSDoc with a one-sentence summary, `@param` for non-obvious inputs, and `@returns` describing the error status codes for routes.
- Expect verbose JSDoc in this codebase. Several files repeat the same JSDoc block twice, once as a `/** */` comment and once as a second `/** What it does ... */` block above the same function (`lib/db/semesters.ts` `rowToSemester`, `app/api/sessions/[id]/route.ts` `GET`). Do not copy that duplication. Write one block.
- Do not restate types in JSDoc prose when TypeScript already states them.

## Function Design

**Size:** Route handlers are thin. They authenticate, validate, call one or more `lib/db/` or `lib/ai/` functions, and return JSON. Business logic belongs in `lib/`, not in the route file (`app/api/CLAUDE.md`).

**Parameters:**
- Positional for one or two inputs (`getSessionById(id)`, `getActiveSemester(userId)`).
- Object input (`CreateSemesterInput`, `UpdateSemesterInput`) for create/update operations.
- Route handlers take `(request: Request, { params }: { params: { id: string } })`. Name an unused request `_request`.

**Return Values:**
- DB functions return domain types (camelCase), never raw Supabase rows. Map with a private `rowTo<Entity>()` helper.
- Routes return `NextResponse.json(...)` with a typed body. Shape the success payload per route (`{ session, promptVersion }` in `app/api/sessions/[id]/route.ts`) and error payloads as `{ error: string }`.
- Not-found DB reads return `null`; list reads return `[]`.

## Module Design

**Exports:**
- Named exports everywhere. Default exports are used only where Next.js requires them (`page.tsx`, `layout.tsx`). Components under `components/` are named exports: about 64 files use `export function` and none use a default export.
- `components/` files export one component. A file may also export its prop interface.

**Barrel Files:**
- `types/index.ts`: required. Every `types/*.ts` file is `export *`-ed from it. Import from `@/types`.
- `lib/constants/index.ts`: required. Import from `@/lib/constants`.
- `lib/supabase/` has no barrel. Import `@/lib/supabase/server` (cookie and admin clients), `@/lib/supabase/client` (browser), or `@/lib/supabase/storage` / `storage.server` directly.
- `lib/db/` has no barrel. Import each entity file directly.

## Data Shapes

- **DB rows** are snake_case and typed with `*Row` interfaces in `types/`.
- **Domain objects** are camelCase. Map at the `lib/db/` boundary only. Shared transforms live in `lib/utils/transforms.ts` (for example `rowToSessionSummary`).
- **Dates** are ISO 8601 strings in transport and display through `lib/utils/format.ts` (`formatDate()` produces locale strings such as "April 4, 2026").
- **Student names** derived from filenames `FirstName_LastName...` are stored as `"firstname L."` and displayed with `formatStudentName()` from `lib/utils/format.ts`.

## Styling and UI

- **Tailwind CSS 3** is the styling system (`tailwind.config.ts`, `app/globals.css`). Utility classes are the default.
- **Theme tokens:** use the CSS variables from `app/globals.css` for anything theme-sensitive: `var(--text-primary)`, `var(--text-secondary)`, `var(--surface)`, `var(--surface-elevated)`, `var(--border-accent)`. These make light and dark mode work.
- **Brand colors:** use `BRAND.ORANGE` (`#f36f21`), `BRAND.PURPLE` (`#542785`), `BRAND.GREEN` (`#0f6b37`) from `@/lib/constants`. Do not type hex values.
  ```tsx
  // Correct
  style={{ background: BRAND.ORANGE }}
  // Wrong
  style={{ background: '#f36f21' }}
  ```
  **Known violation:** `components/ui/Button.tsx` hardcodes `#f36f21`, `#d85e18`, `#542785`, and `#421f6a` in its variant class strings. About 77 files in `components/`, `app/`, and `*.tsx` contain hex literals in total (476 hex occurrences in the same directories), while about 176 `BRAND.*` references exist. Treat hex in existing code as tech debt to migrate, and use `BRAND` in anything new.
- **UI primitives:** use `components/ui/Button.tsx` (variants `primary | secondary | outline | ghost`, sizes `sm | md | lg`, `loading` prop), `components/ui/Card.tsx`, `components/ui/Badge.tsx`, and `components/ui/Spinner.tsx` before creating a new button or card.
- **Class composition:** build conditional classes with template literals or string concatenation. No `clsx`/`cn` helper is in `package.json`.
- **Client boundary:** 54 files under `components/` declare `'use client'`. Add it only when the component uses state, effects, event handlers, or context.

## Next.js Route Conventions

- Every route file under `app/api/` exports `export const dynamic = 'force-dynamic'` so auth cookies are read per request (`app/api/CLAUDE.md`).
- The `app/(app)/layout.tsx` also sets `force-dynamic` so auth is checked per request.
- Dynamic segments use bracket folders: `[id]`, `[token]`, `[studentName]`, `[reportId]`.
- Public, token-based routes live under `app/(public)/` and `app/api/shared/`, `app/api/portfolio/[token]/`, `app/api/speaker/[token]/` and use `createAdminClient()` intentionally.

## Database Access Rules (summary)

- Only `lib/db/` should call `supabase.from(...)`. Pick the client by intent:
  - `createClient()` (cookie, RLS): user-scoped reads from a request.
  - `createAdminClient()` (service role): writes, background jobs, and public token routes. Never use it for a user-scoped read without a reason.
- The `sessions` table is immutable by design. Do not add UPDATE or DELETE queries for it.
- Do not use `.upsert()` with partial unique indexes. Use check-then-insert/update (`lib/db/classInsights.ts`).

**Known violations to be aware of:** `supabase.from(` is called outside `lib/db/` in `app/(app)/analytics/theme/page.tsx`, `app/api/admin/clear/route.ts`, `app/api/sessions/[id]/analysis/route.ts`, `app/api/sessions/[id]/brief/route.ts`, `app/api/sessions/[id]/portal/route.ts`, `app/api/shared/compare/[token]/route.ts`, `lib/ai/reportAgent.ts`, `lib/ai/speakerPortalPostSession.ts`, `lib/ai/studentProfile.ts`, and `scripts/backfill-tiers.ts`. When touching these, move the query into a `lib/db/` function rather than adding another.

## AI Client Usage

- Never instantiate an SDK client directly. Use `getGeminiClient()` from `lib/ai/geminiClient.ts` for agents, or `getOpenRouter()` there for raw OpenAI-SDK-shaped calls. `getStripe()` is in `lib/stripe/index.ts`.
- Model names come from `OPENROUTER_MODEL` with `DEFAULT_MODEL` as fallback. Do not hardcode model IDs in agents.
- Stale references: `app/api/CLAUDE.md` still describes xAI Grok and Gemini as the providers. The live provider is OpenRouter (see the Decision log in `CLAUDE.md`).

## Environment Variables

- Read with `process.env.NAME` at the point of use, inside lazy getters. Throw a clear error when a required key is missing: `throw new Error('Missing OPENROUTER_API_KEY')`.
- The variable list is in `CLAUDE.md` (Environment Variables) and `.env.example`. Never copy values from `.env` or `.env.local` into code, docs, or commits.

## Anti-Patterns Observed (do not repeat)

- Adding a new `alert()` call.
- Hardcoding hex colors in new components.
- Importing `@/lib/constants/routes` or `@/types/session` directly instead of the barrels.
- Returning raw Supabase rows or `snake_case` objects from `lib/db/`.
- Sending `err.message` from an AI route to the client without `extractErrorMessage()`.
- Adding `any` to silence a type error.
- Duplicating JSDoc blocks above a single function.

---

*Convention analysis: 2026-11-18*
