# AGENT-ROUTES.md — Agent 10: API Routes
# Wave 2 agent. Fires after Wave 1 is merged.
# You are the orchestration layer. You call lib/ functions — you do NOT reimplement them.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md (especially GOTCHA-002, GOTCHA-003, GOTCHA-004)
4. API.md ← your complete spec. Every route, every shape.
5. TYPES.md ← every interface you return
6. SCHEMA.md ← understand what's in the database
7. DECISIONS.md (read DEC-010 — API routes orchestrate, lib does the work)

---

## YOUR JOB

Build all API route handlers. You own these files and ONLY these files:

```
app/api/process/route.ts
app/api/sessions/route.ts
app/api/sessions/[id]/route.ts
app/api/sessions/[id]/download/route.ts
app/page.tsx
```

You import from lib/. You do NOT copy logic from lib/ into these files.
If a lib/ function doesn't exist yet, import it anyway — the integration agent will resolve it.
Keep every route handler under 50 lines. If it's longer, logic belongs in lib/.

---

## FILE 1: app/api/process/route.ts

The main pipeline route. Orchestrates: parse → AI → save → respond.

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { buildSubmissionsText } from '@/lib/parse/builder'
import { generateQuestionSheet } from '@/lib/ai/client'
import { insertSession } from '@/lib/db/sessions'

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse multipart form data (see GOTCHA-003)
    const formData = await request.formData()
    const speakerName = formData.get('speakerName') as string | null
    const file = formData.get('file') as File | null

    if (!speakerName?.trim()) {
      return NextResponse.json({ error: 'Missing speakerName' }, { status: 400 })
    }
    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'File must be a ZIP archive' }, { status: 400 })
    }

    // 3. Convert File to Buffer (see GOTCHA-004)
    const arrayBuffer = await file.arrayBuffer()
    const zipBuffer = Buffer.from(arrayBuffer)

    // 4. Extract and parse all student files
    const { text, fileCount } = await buildSubmissionsText(zipBuffer)

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No readable student files found in ZIP' }, { status: 400 })
    }

    // 5. Generate question sheet via AI
    const { output } = await generateQuestionSheet(speakerName.trim(), text)

    // 6. Save session to database
    const session = await insertSession({
      userId: user.id,
      speakerName: speakerName.trim(),
      output,
      fileCount,
    })

    // 7. Return result
    return NextResponse.json({
      sessionId: session.id,
      output: session.output,
      fileCount: session.fileCount,
    })

  } catch (err) {
    console.error('[/api/process]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

---

## FILE 2: app/api/sessions/route.ts

List all sessions for the current user.

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionsByUser } from '@/lib/db/sessions'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await getSessionsByUser(user.id)
    return NextResponse.json({ sessions })

  } catch (err) {
    console.error('[/api/sessions]', err)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
```

---

## FILE 3: app/api/sessions/[id]/route.ts

Fetch a single session with full output.

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify ownership (belt-and-suspenders over RLS)
    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({ session })

  } catch (err) {
    console.error('[/api/sessions/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
```

---

## FILE 4: app/api/sessions/[id]/download/route.ts

Generate and stream a PDF or DOCX file for download.

```ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { generatePDF } from '@/lib/export/pdf'
import { generateDocx } from '@/lib/export/docx'
import { slugifySpeakerName } from '@/lib/utils/format'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ error: 'Invalid format. Use pdf or docx.' }, { status: 400 })
    }

    const slug = slugifySpeakerName(session.speakerName)
    const filename = `${slug}_Questions`

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

  } catch (err) {
    console.error('[/api/sessions/[id]/download]', err)
    return NextResponse.json({ error: 'Failed to generate file' }, { status: 500 })
  }
}
```

---

## FILE 5: app/page.tsx

Root redirect. Server component.

```tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/users'

export default async function RootPage() {
  const user = await getCurrentUser()
  redirect(user ? '/dashboard' : '/login')
}
```

---

## COMPLETION CHECKLIST

- [ ] `app/api/process/route.ts` — full pipeline, all validations, error handling
- [ ] `app/api/sessions/route.ts` — list sessions, auth check
- [ ] `app/api/sessions/[id]/route.ts` — single session with ownership check
- [ ] `app/api/sessions/[id]/download/route.ts` — PDF and DOCX download
- [ ] `app/page.tsx` — root redirect
- [ ] No business logic in routes (only calls to lib/ functions)
- [ ] Every route has a try/catch with error logging
- [ ] Auth is checked on every protected route
- [ ] `npx tsc --noEmit` passes clean
