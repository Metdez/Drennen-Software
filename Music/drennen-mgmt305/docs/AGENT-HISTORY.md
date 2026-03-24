# AGENT-HISTORY.md — Agent 12: History + Deploy
# Wave 3 agent. Fires after Wave 2 is fully merged.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md
4. TYPES.md
5. API.md ← GET /api/sessions and GET /api/sessions/[id]
6. ENV.md ← you write .env.example

---

## YOUR JOB

Build the history page and all deployment artifacts. You own these files and ONLY these files:

```
app/(app)/history/page.tsx
components/SessionsTable.tsx
vercel.json
README.md
.env.example (project root)
```

---

## FILE 1: app/(app)/history/page.tsx

Server Component. Fetches sessions for the current user and renders the SessionsTable.

```tsx
import { getCurrentUser } from '@/lib/db/users'
import { getSessionsByUser } from '@/lib/db/sessions'
import { SessionsTable } from '@/components/SessionsTable'
import { redirect } from 'next/navigation'

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sessions = await getSessionsByUser(user.id)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#542785] mb-2">Session History</h1>
      <p className="text-zinc-500 mb-8">All your past question sheets. Click any row to reopen.</p>
      <SessionsTable sessions={sessions} />
    </div>
  )
}
```

---

## FILE 2: components/SessionsTable.tsx

`"use client"` — needs router for click navigation.

**Props:** `sessions: SessionSummary[]`

**Renders a table with columns:**
| Speaker Name | Date | Files Processed | Action |
|---|---|---|---|
| Jane Smith | March 15, 2024 | 47 files | View → |

- Date formatted as: `March 15, 2024` (use `new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })`)
- Clicking any row: `router.push(`/preview?sessionId=${session.id}`)`
- Row hover: subtle background highlight
- Empty state: "No sessions yet. Go to Dashboard to create your first session."
- Table is clean and minimal — white background, subtle row borders

```tsx
'use client'
import { useRouter } from 'next/navigation'
import type { SessionSummary } from '@/types'

export function SessionsTable({ sessions }: { sessions: SessionSummary[] }) {
  const router = useRouter()

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-400">
        No sessions yet. Go to Dashboard to create your first session.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50">
            <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">Speaker</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">Date</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-zinc-500">Files</th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody>
          {sessions.map(session => (
            <tr
              key={session.id}
              onClick={() => router.push(`/preview?sessionId=${session.id}`)}
              className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 font-medium text-zinc-900">{session.speakerName}</td>
              <td className="px-6 py-4 text-zinc-500">
                {new Date(session.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </td>
              <td className="px-6 py-4 text-zinc-500">{session.fileCount} files</td>
              <td className="px-6 py-4 text-right text-[#f36f21] font-medium">View →</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## FILE 3: vercel.json

```json
{
  "framework": "nextjs",
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/process/route.ts": {
      "maxDuration": 60
    }
  }
}
```

The `maxDuration: 60` on the process route is critical — the AI call plus file processing can take 30-45 seconds. Vercel's default function timeout is 10 seconds. Without this, generation will time out.

---

## FILE 4: README.md

```markdown
# Drennen MGMT 305 — Guest Speaker Question Sheet Generator

A private web application for university professors to turn Canvas student submissions into polished, print-ready interview question sheets.

## Setup

### Prerequisites
- Node.js 18+
- A Supabase project
- An xAI API key
- A Vercel account

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your actual values in `.env.local` (see Environment Variables below)
5. Apply the database schema:
   ```bash
   npx supabase db push
   ```
   Or copy the SQL from `supabase/migrations/` and run it in the Supabase SQL editor.
6. Start the dev server:
   ```bash
   npm run dev
   ```

### Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `XAI_API_KEY` | Your xAI API key |
| `XAI_BASE_URL` | xAI endpoint (default: https://api.x.ai/v1) |
| `XAI_MODEL` | Model to use (default: grok-4-1-fast-reasoning) |

### Deployment to Vercel

1. Push to GitHub
2. Import the project in Vercel
3. Add all environment variables in Vercel → Settings → Environment Variables
4. Deploy

### Adding New Professor Accounts

This app does not allow self-signup. To add a new user:
1. Go to your Supabase project dashboard
2. Authentication → Users → Invite User
3. Enter the professor's email address

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database + Auth:** Supabase
- **AI:** xAI Grok
- **Hosting:** Vercel
- **PDF Export:** @react-pdf/renderer
- **Word Export:** docx
```

---

## FILE 5: .env.example (project root)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# xAI
XAI_API_KEY=your-xai-api-key-here
XAI_BASE_URL=https://api.x.ai/v1
XAI_MODEL=grok-4-1-fast-reasoning
```

---

## COMPLETION CHECKLIST

- [ ] `app/(app)/history/page.tsx` — server component, fetches and renders sessions
- [ ] `components/SessionsTable.tsx` — table with click navigation, empty state
- [ ] `vercel.json` — 60 second function timeout on /api/process
- [ ] `README.md` — complete setup and deployment instructions
- [ ] `.env.example` — placeholder values, no real keys
- [ ] `npx tsc --noEmit` passes with zero errors
