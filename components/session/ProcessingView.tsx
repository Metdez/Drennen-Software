'use client'

/**
 * @file ProcessingView.tsx
 * Animated progress screen shown while the ZIP → AI pipeline is running.
 *
 * Rendered by: app/(app)/dashboard/page.tsx (replaces the upload form during processing)
 *
 * Displays the speaker's name with a glow animation, a fake progress bar that
 * advances through pre-set stages, and a status message.
 *
 * Fake progress design: real API latency is unpredictable, so timed stage
 * transitions give users a sense of forward motion. When `done` becomes true,
 * pending stage timers are cancelled and the bar fills to 100%.
 * When `error` arrives, the view fades out and calls `onExited` after 300 ms.
 */

import { useEffect, useRef, useState } from 'react'

interface ProcessingViewProps {
  /** Name of the speaker being processed — displayed prominently in the center. */
  speakerName: string
  /** Set to `true` by the parent when the API call succeeds. Triggers bar fill + redirect. */
  done: boolean
  /** Non-null when the API call fails. Triggers fade-out and calls `onExited`. */
  error: string | null
  /** Called ~700 ms after `done` becomes true, giving the bar time to reach 100%. */
  onComplete: () => void
  /** Called ~300 ms after `error` is set, once the fade-out transition completes. */
  onExited: () => void
}

/**
 * Full-screen animated processing view.
 *
 * Stage timeline (approximate):
 * - 0 s:    "Extracting files..." at 0%
 * - 1.5 s:  "Reading student submissions..." at 20%
 * - 5.5 s:  "Generating question sheet..." at 50%
 * - 13.5 s: "Finalizing..." at 88%
 * - on done: "Done — redirecting..." at 100%
 *
 * All stage timers are stored in `stageTimersRef` so they can be cancelled
 * atomically when `done` or `error` arrives, preventing stale updates.
 */
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
  // Holds all pending stage setTimeout IDs so they can be batch-cancelled on done/error.
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // Tiny delay before setting visible=true triggers the CSS fade-in transition.
  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(id)
  }, [])

  // Schedule fake progress stages on mount — these run only if the API hasn't finished yet.
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
    // Give the progress animation a moment to reach 100% before notifying the parent.
    const id = setTimeout(onComplete, 700)
    return () => clearTimeout(id)
  }, [done, onComplete])

  // Error: cancel stage timers, fade out, call onExited
  useEffect(() => {
    if (!error) return
    stageTimersRef.current.forEach(clearTimeout)
    stageTimersRef.current = []
    setIsExiting(true)
    // Delay ensures the fade-out transition has time to run before exiting.
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
        <div className="h-0.5 w-12 bg-brand-orange mx-auto" />
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ background: 'var(--border-accent)' }}
        >
          <div
            className="h-full rounded-full bg-brand-orange"
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
