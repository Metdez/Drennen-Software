# DECISIONS.md — Architectural Decision Log
# Every non-obvious choice is recorded here with the reason and the alternatives rejected.
# Before changing any pattern, read the decision that created it.
# If you think a decision is wrong, note it in ERRORS.md — do not silently reverse it.

---

## DEC-001: App Router over Pages Router

**Decision:** Use Next.js App Router (app/) not Pages Router (pages/).

**Why:** Server Components are native to App Router and are essential here — the xAI key, Supabase service role key, and all file processing must stay server-side. App Router makes this the default. Pages Router requires extra ceremony to achieve the same.

**Rejected:** Pages Router — would require wrapping everything in getServerSideProps and manually preventing client-side key exposure.

---

## DEC-002: xAI API called via OpenAI SDK

**Decision:** Use the `openai` npm package pointed at `https://api.x.ai/v1` instead of raw `fetch()`.

**Why:** xAI exposes an OpenAI-compatible API. Using the OpenAI SDK gives us typed responses, retry logic, streaming support, and timeout handling for free. No need for a custom HTTP client.

**Config:**
```ts
import OpenAI from 'openai'
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
})
```

**Rejected:** Raw `fetch()` — more code, less reliability, no built-in retry.

**Rejected:** An xAI-specific SDK — none exists with the maturity of the OpenAI SDK.

---

## DEC-003: File processing entirely in-memory, no disk writes

**Decision:** ZIP files are received as buffers, processed in RAM, and never written to disk or object storage.

**Why:** Files contain student PII (names, academic work). Storing them creates a data retention problem. Processing in memory means nothing persists beyond the request lifecycle.

**Rejected:** S3/Supabase Storage — over-engineered for v1, creates retention liability.

**Rejected:** Writing to /tmp — unreliable on Vercel serverless, still a persistence concern.

**Consequence:** Large ZIP files (100+ submissions at 5MB+ each) could hit Vercel's memory limit. The limit is a known tradeoff for v1. If it becomes a problem the fix is streaming processing, documented here so the future fix is obvious.

---

## DEC-004: System prompt is hardcoded server-side, never user-configurable

**Decision:** The system prompt lives in `lib/ai/prompt.ts` as a string constant. Professors cannot see or edit it. The only runtime injection is the speaker name.

**Why:** The quality of the output depends entirely on the prompt. Allowing users to edit it introduces unpredictable results. This is a deliberate product decision by the professor who designed the workflow.

**Rejected:** User-editable prompt in the UI — explicitly out of scope for v1.

**Rejected:** Prompt stored in database — adds complexity, the prompt doesn't change per-user.

---

## DEC-005: Supabase Auth over custom auth

**Decision:** Use Supabase Auth for both Google OAuth and email/password. No custom JWT handling.

**Why:** Supabase Auth handles token refresh, session cookies, OAuth redirects, and PKCE flow out of the box. The `@supabase/ssr` package integrates it cleanly with Next.js middleware for route protection.

**Rejected:** NextAuth — another dependency, more config, doesn't add value when Supabase is already in the stack.

**Rejected:** Custom JWT — massive over-engineering for an app with one user type.

---

## DEC-006: No self-signup, accounts created by admin

**Decision:** The Supabase project has email signups disabled. The admin creates accounts manually through the Supabase dashboard.

**Why:** This is a private tool for a small set of professors. Open signup would mean anyone who finds the URL could create an account.

**Implementation:** In the Supabase dashboard: Authentication → Providers → Email → disable "Enable email signups". New users are invited via the Supabase Users dashboard.

**Consequence:** The `/login` page only shows Google OAuth and email/password sign-in, no sign-up form.

---

## DEC-007: Output stored as plain text in Supabase, not as a file

**Decision:** The `sessions.output` column is a `text` field containing the raw AI output string. PDF and DOCX are generated on demand from this string at download time.

**Why:** Regenerating from text is cheap. Storing binary files in a database column is wasteful and creates retrieval complexity. The text is the source of truth; the file formats are views over it.

**Rejected:** Storing PDF blob in database — large, slow to retrieve, wasteful.

**Rejected:** Storing files in Supabase Storage — adds a second storage layer, more complex retrieval, overkill for v1.

---

## DEC-008: Row Level Security (RLS) on sessions table

**Decision:** Supabase RLS is enabled on the sessions table. The policy is: users can only SELECT, INSERT their own rows (where `user_id = auth.uid()`). No UPDATE or DELETE.

**Why:** Professors must never see each other's session history. RLS enforces this at the database level, not just the application level — even a bug in the API cannot leak another user's data.

**Consequence:** All database queries go through the Supabase server client (with user JWT), never the service role key, except for the initial session insert which happens server-side after auth verification.

---

## DEC-009: PDF generated with @react-pdf/renderer, not puppeteer

**Decision:** Use `@react-pdf/renderer` to generate PDFs server-side.

**Why:** Puppeteer requires a Chromium binary that (a) is too large for Vercel's function size limits and (b) isn't available in the serverless environment without a paid add-on. `@react-pdf/renderer` is pure JavaScript, works in Vercel serverless, and produces clean documents.

**Rejected:** Puppeteer — Vercel function size limit (50MB compressed), requires Chromium.

**Rejected:** `jsPDF` — poor text layout, not designed for document-style output.

---

## DEC-010: API routes orchestrate, lib functions do the work

**Decision:** `app/api/` route handlers contain no business logic. They validate the request, call `lib/` functions, and return responses. All logic lives in `lib/`.

**Why:** This makes every piece of logic unit-testable independently of HTTP. It also prevents the agent ownership model from breaking — Agent 10 (API Routes) cannot accidentally implement logic that belongs to Agent 07, 08, or 09.

**Rule:** If an API route is longer than ~40 lines, logic belongs in a lib function.
