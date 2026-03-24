# Immersive Loading Experience — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Problem

After submitting the upload form, the user is stuck on the dashboard with only a spinner inside the submit button and "Processing files..." text. The API call is fully synchronous (unzip → parse → AI generation → DB save) and can take 15–30+ seconds. There is no indication of what is happening or how far along the process is, making the experience feel broken.

---

## Goal

Replace the static spinner with a polished, immersive waiting experience that makes the wait feel intentional and professional — consistent with the app's dark, premium aesthetic.

---

## Scope

Frontend only. No backend streaming or SSE changes required. All progress is simulated client-side with a timed animation that holds near completion until the real API response arrives.

---

## Design

### Content Swap

When `isLoading` becomes `true`, the form card fades out and a `ProcessingView` component fades in, taking its place in the same dashboard layout. The `NavHeader` remains visible. No route change occurs.

When the API resolves (success or error), the `ProcessingView` either:
- **Success:** fills the progress bar to 100%, shows "Done — redirecting..." briefly, then the parent calls `router.push('/preview?sessionId=...')`
- **Error:** fades out and the form fades back in with the error message displayed

### ProcessingView Layout

```
[small muted label]   "Preparing your session"

[large speaker name]  "Dick Costolo"
                      [orange underline, matching page title treatment]

[progress bar]        slim, brand-orange fill, smooth easing
                      slow fill to ~88%, then holds until API resolves

[status line]         single line, cycles every 3.5s through stages;
                      freezes on "Finalizing..." once the 88% hold begins

[footer note]         "This usually takes 15–30 seconds"  (muted, small)
```

The view is centered vertically within the content area. Subtle radial glow behind the speaker name using brand orange at ~8% opacity, animated with the existing `pulse-glow` keyframe already defined in `globals.css`.

### Animation Details

**Fade in/out:** `opacity` transition, 300ms ease, on mount/unmount of `ProcessingView` vs form card.

**Progress bar stages (fake-timed):**

| Stage | Target % | Duration | Status text |
|-------|----------|----------|-------------|
| Extracting files | 0 → 20% | 1.5s | "Extracting files..." |
| Reading submissions | 20 → 50% | 4s | "Reading student submissions..." |
| Generating sheet | 50 → 88% | 8s | "Generating question sheet..." |
| Hold | stays at 88% | until API resolves | "Finalizing..." (frozen, no more cycling) |
| Complete | 88 → 100% | 0.4s (on success) | "Done — redirecting..." |

Bar uses `transition: width 0.6s ease-out` with `useEffect`-driven `setTimeout` chains.

**Fast-response handling:** If the API resolves before the animation reaches 88%, all pending stage timers are cancelled and the bar animates directly from its current value to 100% over 0.6s. There is no jump; the bar simply transitions smoothly from wherever it is to 100%.

**Status text:** Advances through messages in sync with stage transitions. Once the 88% hold begins, the status line freezes on "Finalizing..." for the duration of the hold. It does not loop back to earlier messages.

**Speaker name glow:** Uses the existing `pulse-glow` `@keyframes` animation already defined in `globals.css`. Applied as a soft radial background glow behind the speaker name text, ~8% opacity orange, ~4s cycle.

### Component Structure

```
app/(app)/dashboard/page.tsx
  └── isLoading
        false → <DashboardForm />   (existing form JSX)
        true  → <ProcessingView
                  speakerName={speakerName}
                  done={done}
                  error={error}
                />

components/ProcessingView.tsx       ← new file
  props:
    speakerName: string
    done: boolean       ← set to true by parent after sessionStorage.setItem succeeds
    error: string | null ← propagated from parent's error state
```

**Navigation ownership:** The parent page (`dashboard/page.tsx`) owns all side effects. On a successful API response, the parent:
1. Calls `sessionStorage.setItem(`session_${data.sessionId}`, data.output)`
2. Sets `done = true` (which triggers the completion animation in `ProcessingView`)
3. After the 0.4s completion animation, calls `router.push('/preview?sessionId=...')`

The `ProcessingView` component signals completion via an `onComplete` callback prop, which the parent uses to trigger `router.push`. This keeps navigation in the parent and the animation in the component.

Updated props interface:
```typescript
interface ProcessingViewProps {
  speakerName: string
  done: boolean
  error: string | null
  onComplete: () => void   // called by ProcessingView after completion flash
}
```

**Error recovery — fade timing:** When `error` becomes non-null, `ProcessingView` sets an internal `isExiting` state, triggers its fade-out CSS transition (300ms), then calls an `onExited` callback after the transition completes. The parent waits for `onExited` before setting `isLoading = false`. This prevents the component from being unmounted before its fade-out animation finishes.

Updated props interface (final):
```typescript
interface ProcessingViewProps {
  speakerName: string
  done: boolean
  error: string | null
  onComplete: () => void   // called after success animation, parent does router.push
  onExited: () => void     // called after fade-out on error, parent sets isLoading=false
}
```

**`DashboardForm` extraction:** The existing inline form JSX in `dashboard/page.tsx` stays inline — it is conditionally rendered via `{!isLoading && <form>...</form>}`. No extraction to a separate component or file is needed; the conditional is simple enough to read inline.

### File Changes

| File | Change |
|------|--------|
| `app/(app)/dashboard/page.tsx` | Add `done` state, `ProcessingView` conditional render, `onComplete`/`onExited` handlers |
| `components/ProcessingView.tsx` | New component — all loading animation logic lives here |

No API, DB, export, or globals.css changes required.

---

## Out of Scope

- Real server-side progress events (SSE/streaming) — future enhancement
- File count display during loading (file count not known until API responds)
- Cancellation of in-flight requests
