'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpeakerInput } from '@/components/SpeakerInput'
import { DropZone } from '@/components/DropZone'
import { ProcessingView } from '@/components/ProcessingView'
import { PaywallModal } from '@/components/PaywallModal'
import { ROUTES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { uploadTempZip } from '@/lib/supabase/storage'
import { useSemesterContext } from '@/components/SemesterContext'
import { useSubscription } from '@/components/SubscriptionContext'

export default function DashboardPage() {
  const router = useRouter()
  const { activeSemester } = useSemesterContext()
  const { canGenerate, reason, isLoading: subscriptionLoading } = useSubscription()
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired — please sign in again.')
        return
      }
      const storagePath = await uploadTempZip(user.id, file)
      const res = await fetch(ROUTES.API_PROCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerName, storagePath }),
      })
      let data: Record<string, unknown> = {}
      try {
        data = await res.json()
      } catch {
        setError('Upload failed — the file may be too large or the server timed out.')
        return
      }

      if (!res.ok) {
        // ProcessingView watches `error` and handles its own fade-out before calling onExited
        setError((data.error as string) || 'Failed to process files')
        return
      }

      sessionStorage.setItem(`session_${data.sessionId}`, data.output as string)
      sessionStorage.setItem(`overlap_${data.sessionId}`, JSON.stringify(data.overlappingThemes ?? []))
      pendingSessionIdRef.current = data.sessionId as string
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

  if (!subscriptionLoading && !canGenerate) {
    return <PaywallModal reason={reason} />
  }

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
            <div className="h-0.5 w-12 bg-brand-orange mb-3" />
            <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
              Enter the speaker&apos;s name and upload the Canvas ZIP file to generate a question sheet.
            </p>
            {activeSemester && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-green)]" />
                Uploading to: {activeSemester.name}
              </div>
            )}
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
            className="animate-fade-up-delay-2 w-full py-4 rounded-xl bg-brand-orange text-white font-semibold text-base hover:bg-[#d85e18] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-[family-name:var(--font-dm-sans)] hover:shadow-[0_4px_20px_rgba(243,111,33,0.3)]"
          >
            Generate Question Sheet
          </button>
        </>
      )}
    </div>
  )
}
