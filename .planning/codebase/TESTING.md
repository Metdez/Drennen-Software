---
last_mapped_commit: 61012611b3bbfe57df4d8eb25c37b98b17a2d673
last_mapped_at: 2026-11-18
---
# Testing Patterns

**Analysis Date:** 2026-11-18

## Summary

No automated test framework is installed or configured. `package.json` has no `test` script, no test runner in `dependencies` or `devDependencies`, and no test, spec, `__tests__`, Jest, Vitest, or Playwright config exists in the tracked source. `CLAUDE.md` (Commands) states: "no test runner; this is the check." `README.md` (Verification) states: "There is no dedicated test runner script in `package.json` yet."

Verification is manual plus three static gates. Treat that as the baseline, and do not claim coverage that does not exist.

## Test Framework

**Runner:**
- Not detected. No `jest.config.*`, `vitest.config.*`, `playwright.config.*`, or `*.test.*` / `*.spec.*` files in the repo.
- Config: none.

**Assertion Library:**
- Not detected. Node's `assert` is not used in tracked source.

**Run Commands (what actually exists):**
```bash
npm run lint           # next lint (ESLint, next/core-web-vitals)
npm run type-check     # tsc --noEmit (strict TypeScript)
npm run build          # next build (catches route and import errors at build time)
```

Run all three before reporting application work as done. `CLAUDE.md` Working Style requires `npx tsc --noEmit` and `npm run build` after multi-file changes. `README.md` lists the same three checks before pushing.

**Database checks:**
```bash
supabase db reset      # re-run all migrations from scratch on the local stack
```
`supabase/CLAUDE.md` requires this after creating a migration, to confirm it applies cleanly. Never edit a past migration in `supabase/migrations/`.

**Manual smoke test (documented):**
- The login page has a demo ZIP shortcut backed by `public/mock-questions.zip` (`README.md`), which is the intended end-to-end smoke path once Supabase Auth and env vars are set.
- Production checklist includes a smoke test with a small Canvas ZIP (`README.md` Deployment).

## Test File Organization

**Location:**
- Not applicable. No test files exist. If tests are added, co-locate them next to the source file or create a top-level `__tests__/` directory. Choose one and document it here and in `CLAUDE.md`.

**Naming:**
- Not detected. Use `<name>.test.ts` (or `.test.tsx`) if adopting a runner. This matches the ecosystem default and is what `.gitignore` expects for `/coverage` output.

**Structure:**
- Not applicable.

## Test Structure

**Suite Organization:**
- Not applicable. There is no existing suite to copy.

**Patterns:**
- Not applicable.

## Mocking

**Framework:** Not detected.

**Seams already present in the code that make mocking straightforward:**
- Lazy singletons with a `getX()` accessor. Replace the singleton or the module at the boundary instead of patching internals:
  - `getOpenRouter()` and `getGeminiClient()` in `lib/ai/geminiClient.ts`
  - `getStripe()` in `lib/stripe/index.ts`
- Auth is isolated behind `getCurrentUser()` in `lib/db/users.ts`. Routes call only this function for identity, so a test can stub it and exercise each route's 401 / 404 / 200 branches.
- DB access is isolated in `lib/db/`. Routes and agents import named functions from there (`getSessionById`, `getActiveSemester`), so a route test can stub those functions instead of mocking `supabase.from(...)`.
- Clients are created in `lib/supabase/server.ts` (`createClient`, `createAdminClient`). Stub the module to avoid network access.

**What to Mock (when tests are introduced):**
- External network: OpenRouter (`openai` SDK via `getOpenRouter()`), Stripe (`getStripe()`), Supabase (`lib/supabase/server.ts`).
- Auth identity: `getCurrentUser()`.
- Time and randomness where a test depends on dates. Date output in `lib/utils/format.ts` (`formatDate()`) is locale-dependent.

**What NOT to Mock:**
- Pure transforms and formatters. They are the cheapest and most valuable to test directly: `lib/utils/format.ts` (`formatStudentName`, `formatDate`, `formatFileCount`, `slugifySpeakerName`), `lib/utils/transforms.ts` (`rowToSession`, `rowToSessionSummary`, `rowToDebrief`), and `lib/utils/errors.ts` (`extractErrorMessage`).
- Row-to-domain mapping, which is the boundary contract for `lib/db/` callers.
- Parsing pipeline logic in `lib/parse/parseQuestions.ts` and `lib/parse/parseThemes.ts`, which operate on strings.

## Fixtures and Factories

**Test Data:**
- Not detected in code. A sample Canvas ZIP is shipped as `public/mock-questions.zip` for manual use. Do not treat it as a unit-test fixture without a loader.
- Database schema and seed-like data live in `supabase/migrations/`. `supabase/snippets/` exists but is not used by tests.

**Location:**
- If fixtures are added, put them under a `fixtures/` or `__tests__/fixtures/` directory, not in `public/`.

## Coverage

**Requirements:** None enforced. No coverage tool is configured. `.gitignore` already ignores `/coverage`, so a future coverage run will not be committed.

**View Coverage:**
```bash
# Not available until a test runner is added.
```

## Test Types

**Unit Tests:**
- None present. The best first candidates are the pure helpers listed above in "What NOT to Mock".

**Integration Tests:**
- None present. The natural integration points are the route handlers under `app/api/**` (auth, ownership, status codes) and `lib/db/` functions against a local Supabase stack from `supabase start`.

**E2E Tests:**
- Not used. Verification is manual through the running app (`npm run dev`) and the documented ZIP smoke test.

**Migrations as a test:**
- `supabase db reset` replays `supabase/migrations/` from scratch. This is the only automated correctness gate on the schema, and it is manual.

## Common Patterns

**Async verification (as currently practiced):**
- Fire-and-forget AI jobs are not awaited in routes (`app/api/process/route.ts`), so their results appear on a later page load. Verify them by reloading the relevant page, not by inspecting the route response.
- Several analytics routes fall back to synchronous regeneration when a cache row is empty (`app/api/CLAUDE.md`). To test the cold path, delete the cached row locally first.

**Error-path verification:**
- Confirm that AI route errors are sanitized. Trigger a provider error and check that the response is `{ error: <friendly message> }` with no raw JSON envelope. The helper that does this is `extractErrorMessage()` in `lib/utils/errors.ts`, and its 429 / `RESOURCE_EXHAUSTED` mapping is the one branch worth a unit test first.
- Confirm the 404-not-403 ownership rule by requesting another user's session id (`app/api/sessions/[id]/route.ts`).

**Example: a minimal first test (not yet in the repo; for reference when adopting a runner):**
```ts
// lib/utils/errors.test.ts (illustrative)
import { extractErrorMessage } from '@/lib/utils/errors'

test('maps Gemini-style 429 to the friendly message', () => {
  const raw = JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota' } })
  expect(extractErrorMessage(new Error(raw))).toMatch(/temporarily unavailable/)
})
```
Adopting Vitest or Jest also requires the `@/` path alias mapping from `tsconfig.json` (`paths: { "@/*": ["./*"] }`) in the runner config. Add that when you add the runner.

## Adding Tests (guidance for future work)

1. Choose a runner and add a `test` script to `package.json`. Keep `npm run type-check` and `npm run lint` as the first gates.
2. Add the `@/` alias mapping to the runner config.
3. Start with the pure helpers in `lib/utils/`, then the parsers in `lib/parse/`, then route handlers with stubbed `getCurrentUser()` and `lib/db/` functions.
4. Update this file, `CLAUDE.md` (Commands and Architecture), and `README.md` (Verification) in the same change. `CLAUDE.md`'s self-maintenance rule applies.

---

*Testing analysis: 2026-11-18*
