# INTEGRATION.md — Integration Agent
# This file is read by a single agent that runs AFTER all 12 agents have completed.
# Its job is to stitch everything together, resolve conflicts, and verify the build.

---

## MANDATORY PRE-READ (in order)

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md ← read every entry
4. SCHEMA.md
5. API.md
6. TYPES.md
7. ENV.md

Then read every file in the actual codebase before touching anything.

---

## YOUR JOB

You are the quality gate. Every agent before you built in isolation. You make sure they connect.
You do not add features. You do not refactor. You fix connection points and nothing else.

---

## STEP 1: TYPESCRIPT AUDIT

Run:
```bash
npx tsc --noEmit
```

Fix every error. Log each one in ERRORS.md using the standard format before fixing it.
Common issues at this stage:
- Missing imports between lib/ files
- Type mismatches between API route return shapes and what the UI expects
- Interface names that don't match between TYPES.md spec and actual implementation

---

## STEP 2: IMPORT AUDIT

Run this and verify every result:
```bash
grep -r "from '@/" --include="*.ts" --include="*.tsx" .
```

For every import, verify the target file exists. If it doesn't:
1. Check STRUCTURE.md — if the file should exist, it was missed
2. Note which agent missed it
3. Create the missing file according to STRUCTURE.md spec
4. Log it in ERRORS.md

---

## STEP 3: ENV VAR AUDIT

Run:
```bash
grep -r "process\.env\." --include="*.ts" --include="*.tsx" .
```

Every result must:
1. Reference a variable that exists in ENV.md
2. Be in a server-side file (lib/, app/api/, middleware.ts) — not in components/ or client pages
3. Have a fallback or non-null assertion if appropriate

Flag any `process.env.X` reference in a client component as a critical security issue.

---

## STEP 4: API ROUTE VERIFICATION

For each route in API.md, verify:

**POST /api/process:**
- [ ] File exists at `app/api/process/route.ts`
- [ ] Accepts `multipart/form-data` with `speakerName` and `file`
- [ ] Calls `buildSubmissionsText` from `lib/parse/builder.ts`
- [ ] Calls `generateQuestionSheet` from `lib/ai/client.ts`
- [ ] Calls `insertSession` from `lib/db/sessions.ts`
- [ ] Returns `{ sessionId, output, fileCount }`

**GET /api/sessions:**
- [ ] File exists at `app/api/sessions/route.ts`
- [ ] Verifies auth before querying
- [ ] Calls `getSessionsByUser` from `lib/db/sessions.ts`
- [ ] Returns `{ sessions: SessionSummary[] }` (no output field in list)

**GET /api/sessions/[id]:**
- [ ] File exists at `app/api/sessions/[id]/route.ts`
- [ ] Verifies auth
- [ ] Calls `getSessionById` from `lib/db/sessions.ts`
- [ ] Returns `{ session: Session }` with full output field

**GET /api/sessions/[id] with ?format= (download):**
- [ ] Agent 11 flagged this as needed in their completion report
- [ ] If missing, create `app/api/sessions/[id]/download/route.ts`:
  ```ts
  // GET /api/sessions/[id]/download?format=pdf|docx
  // Fetches session, generates file, returns buffer with correct Content-Type
  ```
  This is a known gap — Agent 11 triggers downloads but the download route may not have been created by Agent 10.

---

## STEP 5: DOWNLOAD ROUTE (likely missing — build it here)

This route is needed by `DownloadButtons.tsx` but may not have been built by Agent 10 (who was focused on the data routes). Create it if missing:

```ts
// app/api/sessions/[id]/download/route.ts
import { createClient } from '@/lib/supabase/server'
import { getSessionById } from '@/lib/db/sessions'
import { getCurrentUser } from '@/lib/db/users'
import { generatePDF } from '@/lib/export/pdf'
import { generateDocx } from '@/lib/export/docx'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const session = await getSessionById(params.id)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') as 'pdf' | 'docx'

  if (!['pdf', 'docx'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  }

  const filename = `${session.speakerName.replace(/\s+/g, '_')}_Questions`

  if (format === 'pdf') {
    const buffer = await generatePDF(session.output, session.speakerName)
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  }

  const buffer = await generateDocx(session.output, session.speakerName)
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${filename}.docx"`,
    },
  })
}
```

---

## STEP 6: ROOT PAGE REDIRECT

Verify `app/page.tsx` exists and redirects correctly:

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/users'

export default async function RootPage() {
  const user = await getCurrentUser()
  redirect(user ? '/dashboard' : '/login')
}
```

---

## STEP 7: PACKAGE.JSON DEDUPLICATION

Check for duplicate or conflicting packages:
```bash
cat package.json
```

If multiple agents added different PDF libraries (e.g., both `jsPDF` and `@react-pdf/renderer`), keep only `@react-pdf/renderer` as per DECISIONS.md DEC-009.

---

## STEP 8: SMOKE TEST

After all fixes, run:
```bash
npm run build
```

A successful build means:
- No TypeScript errors
- No missing modules
- No import errors
- All pages and API routes compile

If the build fails, fix errors and run again until it passes clean.

---

## STEP 9: LOG ALL FIXES

Every fix you made goes into ERRORS.md as a new entry. Use the format:

```
## ERR-[next number]
**Symptom:** [what was broken]
**Root cause:** [why it happened]
**Fix applied:** [what you changed]
**Files affected:** [which files]
**Prevention rule:** [what agents should do differently next time]
```

---

## COMPLETION CHECKLIST

- [ ] `npx tsc --noEmit` passes clean
- [ ] `npm run build` passes clean
- [ ] All API routes exist and match API.md contracts
- [ ] Download route exists at `/api/sessions/[id]/download`
- [ ] Root page redirects correctly
- [ ] No `process.env` references in client components
- [ ] All imports resolve to existing files
- [ ] No duplicate type definitions
- [ ] ERRORS.md updated with all fixes found
- [ ] App is ready for `vercel deploy`
