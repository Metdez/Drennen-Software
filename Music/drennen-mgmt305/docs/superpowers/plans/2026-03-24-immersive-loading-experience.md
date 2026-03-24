# Immersive Loading Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static spinner on the dashboard with an immersive animated waiting screen that shows the speaker name, a faked progress bar, and cycling status messages while the API call runs.

**Architecture:** A new `ProcessingView` component owns all animation logic and communicates back to the parent via `onComplete` and `onExited` callbacks. The parent (`dashboard/page.tsx`) owns navigation and state cleanup. No backend changes required.

**Tech Stack:** Next.js 14 App Router, React 18 (`useState`, `useEffect`, `useRef`, `useCallback`), Tailwind CSS, TypeScript strict mode.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `components/ProcessingView.tsx` | **Create** | All animation logic: progress stages, status messages, fade in/out, callbacks |
| `app/(app)/dashboard/page.tsx` | **Modify** | Add `done` + `sessionId` state; swap form for `ProcessingView` when loading; handle `onComplete`/`onExited` |

---

## Task 1: Create `ProcessingView` component

**Files:**
- Create: `components/ProcessingView.tsx`

### What this component does

`ProcessingView` receives four props:
- `speakerName: string` — displayed large in the center
- `done: boolean` — flipped to `true` by parent on API success; triggers completion flash then `onComplete`
- `error: string | null` — set by parent on API failure; triggers fade-out then `onExited`
- `onComplete: () => void` — called after the 100% animation; parent navigates
- `onExited: () => void` — called after error fade-out; parent sets `isLoading = false`

On mount it schedules three timers that advance a fake progress bar from 0 → 20 → 50 → 88% with matching status messages. It then holds at 88% until `done` or `error` arrives. If `done` arrives before 88%, pending timers are cancelled and the bar animates straight to 100%.

- [ ] **Step 1: Create the file with the full component**

Create `components/ProcessingView.tsx` with this exact content:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'

interface ProcessingViewProps {
  speakerName: string
  done: boolean
  error: string | null
  onComplete: () => void
  onExited: () => void
}

export function ProcessingView({
  speakerName,
  done,
  error,
  onComplete,
  onExited,
}: ProcessingViewProps) {
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('Extracting files...')
  const [visible, setVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Fade in on first paint
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(id)
  }, [])

  // Schedule fake progress stages on mount
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    const at = (delay: number, fn: () => void) => {
      const id = setTimeout(fn, delay)
      timers.push(id)
    }

    at(1500, () => {
      setProgress(20)
      setMessage('Reading student submissions...')
    })
    at(1500 + 4000, () => {
      setProgress(50)
      setMessage('Generating question sheet...')
    })
    at(1500 + 4000 + 8000, () => {
      setProgress(88)
      setMessage('Finalizing...')
    })

    stageTimersRef.current = timers
    return () => timers.forEach(clearTimeout)
  }, [])

  // Success: cancel stage timers, fill bar, call onComplete
  useEffect(() => {
    if (!done) return
    stageTimersRef.current.forEach(clearTimeout)
    stageTimersRef.current = []
    setProgress(100)
    setMessage('Done — redirecting...')
    const id = setTimeout(onComplete, 600)
    return () => clearTimeout(id)
  }, [done, onComplete])

  // Error: cancel stage timers, fade out, call onExited
  useEffect(() => {
    if (!error) return
    stageTimersRef.current.forEach(clearTimeout)
    stageTimersRef.current = []
    setIsExiting(true)
    const id = setTimeout(onExited, 300)
    return () => clearTimeout(id)
  }, [error, onExited])

  return (
    <div
      className="flex flex-col items-center justify-center gap-8 py-16 transition-opacity duration-300"
      style={{ opacity: isExiting ? 0 : visible ? 1 : 0 }}
    >
      {/* Label */}
      <p
        className="text-xs uppercase tracking-widest font-[family-name:var(--font-dm-sans)]"
        style={{ color: 'var(--text-muted)' }}
      >
        Preparing your session
      </p>

      {/* Speaker name — glow applied to wrapper so box-shadow halos the block, not the text itself */}
      <div
        className="text-center px-6 py-2 rounded-xl"
        style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}
      >
        <h2 className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-[var(--text-primary)] mb-3">
          {speakerName}
        </h2>
        <div className="h-0.5 w-12 bg-[#f36f21] mx-auto" />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: 'var(--border-accent)' }}
        >
          <div
            className="h-full rounded-full bg-[#f36f21]"
            style={{ width: `${progress}%`, transition: 'width 0.6s ease-out' }}
          />
        </div>
      </div>

      {/* Status message */}
      <p
        className="text-sm font-[family-name:var(--font-dm-sans)] transition-opacity duration-200"
        style={{ color: 'var(--text-secondary)' }}
      >
        {message}
      </p>

      {/* Footer */}
      <p
        className="text-xs font-[family-name:var(--font-dm-sans)]"
        style={{ color: 'var(--text-muted)' }}
      >
        This usually takes 15–30 seconds
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Run type-check to verify no TypeScript errors**

```bash
cd "c:/Users/John Doe/Music/drennen-mgmt305" && npm run type-check
```

Expected: no errors. If errors appear, fix them before proceeding.

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/John Doe/Music/drennen-mgmt305"
git add components/ProcessingView.tsx
git commit -m "feat: add ProcessingView component with animated loading stages"
```

---

## Task 2: Wire `ProcessingView` into `dashboard/page.tsx`

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

### What changes

1. Add `done: boolean` state and `pendingSessionIdRef` ref to hold the session ID between the API response and the router push.
2. In the success path: store the session ID in the ref + sessionStorage, then `setDone(true)` instead of immediately calling `router.push`.
3. In the error path: remove the `setIsLoading(false)` calls — `ProcessingView`'s `onExited` callback now owns that.
4. Add `handleComplete` (navigates to preview) and `handleExited` (resets loading state).
5. Conditionally render `ProcessingView` when `isLoading`, the existing form when `!isLoading`.
6. Fix the `err: any` type violation while we're in this file.

- [ ] **Step 1: Replace the full file contents**

Replace `app/(app)/dashboard/page.tsx` with:

```tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpeakerInput } from '@/components/SpeakerInput'
import { DropZone } from '@/components/DropZone'
import { ProcessingView } from '@/components/ProcessingView'
import { ROUTES } from '@/lib/constants'

export default function DashboardPage() {
  const router = useRouter()
  const [speakerName, setSpeakerName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Holds the session ID from API response until the completion animation fires
  const pendingSessionIdRef = useRef<string | null>(null)

  const handleGenerate = async () => {
    if (!speakerName || !file) return

    setIsLoading(true)
    setDone(false)
    setError(null)
    pendingSessionIdRef.current = null

    try {
      const formData = new FormData()
      formData.append('speakerName', speakerName)
      formData.append('file', file)

      const res = await fetch(ROUTES.API_PROCESS, { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        // ProcessingView watches `error` and handles its own fade-out before calling onExited
        setError(data.error || 'Failed to process files')
        return
      }

      sessionStorage.setItem(`session_${data.sessionId}`, data.output)
      pendingSessionIdRef.current = data.sessionId
      setDone(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
    }
  }

  // Called by ProcessingView after the 100% completion flash
  const handleComplete = useCallback(() => {
    if (pendingSessionIdRef.current) {
      router.push(`${ROUTES.PREVIEW}?sessionId=${pendingSessionIdRef.current}`)
    }
  }, [router])

  // Called by ProcessingView after its fade-out completes on error
  const handleExited = useCallback(() => {
    setIsLoading(false)
    setDone(false)
    setError(null)
  }, [])

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      {isLoading ? (
        <ProcessingView
          speakerName={speakerName}
          done={done}
          error={error}
          onComplete={handleComplete}
          onExited={handleExited}
        />
      ) : (
        <>
          {/* Hero header */}
          <div className="animate-fade-up">
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
              New Session
            </h1>
            <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
            <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
              Enter the speaker&apos;s name and upload the Canvas ZIP file to generate a question sheet.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="animate-fade-up p-4 rounded-lg bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.2)] text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
              {error}
            </div>
          )}

          {/* Form card */}
          <div
            className="animate-fade-up-delay-1 p-6 rounded-2xl border border-[var(--border-accent)] flex flex-col gap-6"
            style={{ background: 'var(--surface)' }}
          >
            <SpeakerInput value={speakerName} onChangeAction={setSpeakerName} />
            <DropZone onFileChangeAction={setFile} />
          </div>

          {/* Generate button */}
          <button
            disabled={!speakerName || !file || isLoading}
            onClick={handleGenerate}
            className="animate-fade-up-delay-2 w-full py-4 rounded-xl bg-[#f36f21] text-white font-semibold text-base hover:bg-[#d85e18] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-[family-name:var(--font-dm-sans)] hover:shadow-[0_4px_20px_rgba(243,111,33,0.3)]"
          >
            Generate Question Sheet
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
cd "c:/Users/John Doe/Music/drennen-mgmt305" && npm run type-check
```

Expected: no errors. Fix any before proceeding.

- [ ] **Step 3: Smoke-test in the browser**

```bash
cd "c:/Users/John Doe/Music/drennen-mgmt305" && npm run dev
```

Open `http://localhost:3000`. Log in, go to Dashboard, enter any speaker name and drop any ZIP file, click Generate. Verify:

1. Form fades out and `ProcessingView` fades in with the speaker name displayed
2. Progress bar begins advancing (0 → 20% after ~1.5s)
3. Status text cycles: "Extracting files..." → "Reading student submissions..." → "Generating question sheet..." → "Finalizing..."
4. When the API responds, bar fills to 100% and shows "Done — redirecting..."
5. Navigation to `/preview` fires after ~0.6s

To test the error path: temporarily edit `handleGenerate` to `setError('Test error')` right after `setIsLoading(true)` and before the fetch, confirm `ProcessingView` fades out and the form fades back in showing the error. Revert that change when done.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/John Doe/Music/drennen-mgmt305"
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat: wire ProcessingView into dashboard, replace static spinner"
```

---

## Done

Both files changed. Run `npm run type-check` one final time to confirm a clean build before calling this complete.
