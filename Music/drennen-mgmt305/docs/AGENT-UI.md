# AGENT-UI.md — Agent 11: Main UI
# Wave 3 agent. Fires after Wave 2 is fully merged and dev server runs.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md
4. TYPES.md
5. API.md ← you will be calling these routes
6. DECISIONS.md (read DEC-001 on App Router)

---

## YOUR JOB

Build the main application UI. You own these files and ONLY these files:

```
app/layout.tsx
app/(app)/layout.tsx
app/(app)/dashboard/page.tsx
app/(app)/preview/page.tsx
components/DropZone.tsx
components/SpeakerInput.tsx
components/OutputPreview.tsx
components/DownloadButtons.tsx
components/NavHeader.tsx
```

---

## DESIGN LANGUAGE

- Background: white / zinc-50
- Primary actions: `bg-[#f36f21]` (orange) with white text
- Headers and accents: `text-[#542785]` (purple)
- Success states: `text-[#0f6b37]` (green)
- Use Tailwind utility classes throughout
- Clean, minimal academic aesthetic — this is a tool for professors, not a consumer app
- No animations beyond a simple loading spinner
- Mobile responsive but optimized for desktop (professors use laptops)

---

## FILE 1: app/layout.tsx

Root layout. Sets metadata, fonts, viewport.

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Drennen MGMT 305',
  description: 'Guest Speaker Question Sheet Generator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

---

## FILE 2: app/(app)/layout.tsx

Protected app layout. Wraps all dashboard/preview/history pages with the NavHeader.

```tsx
import { NavHeader } from '@/components/NavHeader'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <NavHeader />
      <main className="max-w-4xl mx-auto px-6 py-10">
        {children}
      </main>
    </div>
  )
}
```

---

## FILE 3: components/NavHeader.tsx

`"use client"` — needs the Supabase client for logout.

- Left: "Drennen MGMT 305" in purple (#542785), bold
- Right: user email (muted text) + "Sign out" button
- On sign out: call `supabase.auth.signOut()`, redirect to `/login`
- Simple horizontal bar, white background, subtle bottom border

---

## FILE 4: app/(app)/dashboard/page.tsx

The main upload page. This is where the professor spends most of their time.

**Layout (top to bottom):**
1. Page title: "New Session" (purple)
2. Speaker name input (SpeakerInput component)
3. ZIP file drop zone (DropZone component)
4. Generate button (orange, full width, disabled until both inputs filled)
5. Loading state while processing (spinner + "Processing X files...")
6. On success: router.push(`/preview?sessionId=${sessionId}`) — pass output in sessionStorage too

**State this page manages:**
- `speakerName: string`
- `file: File | null`
- `isLoading: boolean`
- `error: string | null`
- `fileCount: number` (shown during loading)

**On Generate click:**
```ts
const formData = new FormData()
formData.append('speakerName', speakerName)
formData.append('file', file)

const res = await fetch('/api/process', { method: 'POST', body: formData })
const data = await res.json()

if (!res.ok) { setError(data.error); return }

// Store output in sessionStorage so preview page can access it without a second fetch
sessionStorage.setItem(`session_${data.sessionId}`, data.output)
router.push(`/preview?sessionId=${data.sessionId}`)
```

---

## FILE 5: components/SpeakerInput.tsx

`"use client"` — controlled input.

- Label: "Guest Speaker Name"
- Placeholder: "e.g. Jane Smith, CEO of Acme Corp"
- Clean text input, full width
- Accepts `value` and `onChange` props

---

## FILE 6: components/DropZone.tsx

`"use client"` — needs browser drag events.

- Dashed border box, centered text
- Default state: "Drag & drop your Canvas ZIP file here, or click to browse"
- File selected state: show filename and size, green checkmark icon (use an emoji ✓ or SVG)
- Accepts `.zip` files only (`accept=".zip"`)
- Accepts `onFileChange: (file: File | null) => void` prop
- On invalid file type: show inline error "Please upload a ZIP file"

---

## FILE 7: app/(app)/preview/page.tsx

`"use client"` — reads sessionStorage.

**On mount:**
1. Get `sessionId` from URL search params
2. Try to read output from `sessionStorage.getItem(`session_${sessionId}`)`
3. If not in sessionStorage (e.g. they navigated directly), fetch from `GET /api/sessions/${sessionId}`
4. Render OutputPreview and DownloadButtons

**Layout:**
- Back link: "← New Session" (links to /dashboard)
- Session info: speaker name + date + file count (fetched with the session)
- OutputPreview component (the formatted output)
- DownloadButtons component (PDF and Word)

---

## FILE 8: components/OutputPreview.tsx

Renders the AI output string as formatted HTML for on-screen preview.

- Receives `output: string` prop
- Parse the markdown-like format: `**SECTION N: TITLE**`, `**PRIMARY:**`, `*— attribution*`
- Render with appropriate typography — section headers in purple, primary questions prominent, attribution in small muted italic
- This is a read-only display component, no interactivity
- Wrap in a white card with subtle shadow and padding

---

## FILE 9: components/DownloadButtons.tsx

`"use client"` — triggers file downloads.

Two buttons side by side:
- "Download PDF" (orange, primary)
- "Download Word Doc" (purple outline, secondary)

**Download mechanism:**
```ts
async function downloadFile(format: 'pdf' | 'docx') {
  setLoading(format)
  const res = await fetch(`/api/sessions/${sessionId}/download?format=${format}`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${speakerName.replace(/\s+/g, '_')}_Questions.${format === 'pdf' ? 'pdf' : 'docx'}`
  a.click()
  URL.revokeObjectURL(url)
  setLoading(null)
}
```

Note: Agent 10 must add the `/api/sessions/[id]/download` route. Flag this in your completion report.

---

## COMPLETION CHECKLIST

- [ ] `app/layout.tsx` — root layout with metadata
- [ ] `app/(app)/layout.tsx` — NavHeader wrapper
- [ ] `components/NavHeader.tsx` — logo + user email + sign out
- [ ] `app/(app)/dashboard/page.tsx` — full upload flow with loading/error states
- [ ] `components/SpeakerInput.tsx` — controlled text input
- [ ] `components/DropZone.tsx` — drag-drop with validation
- [ ] `app/(app)/preview/page.tsx` — reads session, shows output
- [ ] `components/OutputPreview.tsx` — formatted output display
- [ ] `components/DownloadButtons.tsx` — PDF and Word triggers
- [ ] All `"use client"` components are marked
- [ ] No direct database calls from any page (all go through API routes)
- [ ] `npx tsc --noEmit` passes with zero errors
