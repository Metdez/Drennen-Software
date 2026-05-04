/**
 * Dashboard page (`/dashboard`).
 *
 * Main upload form for creating a new session. Professors enter a speaker name,
 * upload a Canvas ZIP of student submissions, and trigger the AI pipeline.
 *
 * Key behaviors:
 * - Checks subscription access via `SubscriptionContext`; shows `PaywallModal` if blocked.
 * - On submit: uploads ZIP to Supabase Storage via `uploadTempZip`, then POSTs to
 *   `/api/process` with the resulting `storagePath`.
 * - On success: caches AI output and overlapping themes in `sessionStorage`, then
 *   navigates to `/preview?sessionId=...`.
 * - Handles post-Stripe-checkout redirect (`?checkout=success&session_id=`) by
 *   verifying with `/api/stripe/checkout` and refreshing subscription state.
 * - Handles first-signup welcome banner via `?welcome=true` query param.
 * - Renders `ProcessingView` during generation (animated progress indicator).
 * - Renders `SystemPromptEditor` so professors can preview / switch prompt versions.
 *
 * Components: SpeakerInput, DropZone, ProcessingView, SystemPromptEditor, PaywallModal
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SpeakerInput } from '@/components/session/SpeakerInput'
import { DropZone } from '@/components/session/DropZone'
import { ProcessingView } from '@/components/session/ProcessingView'
import { SystemPromptEditor } from '@/components/session/SystemPromptEditor'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import { ROUTES, BRAND } from '@/lib/constants'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { uploadTempZip } from '@/lib/supabase/storage'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import { useSubscription } from '@/components/subscription/SubscriptionContext'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeSemester } = useSemesterContext()
  const { canGenerate, reason, isLoading: subscriptionLoading, refreshSubscription } = useSubscription()
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [speakerName, setSpeakerName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Holds the session ID from API response until the completion animation fires
  const pendingSessionIdRef = useRef<string | null>(null)

  // Handle post-checkout redirect — verify with Stripe and sync DB
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      const sessionId = searchParams.get('session_id')

      async function verifyCheckout() {
        if (sessionId) {
          try {
            await fetch(`/api/stripe/checkout?session_id=${sessionId}`)
          } catch {
            // Verification failed — webhook may still handle it
          }
        }
        await refreshSubscription()
        setCheckoutSuccess(true)
      }

      verifyCheckout()

      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('checkout')
      url.searchParams.delete('session_id')
      router.replace(url.pathname + url.search, { scroll: false })
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setCheckoutSuccess(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, refreshSubscription, router])

  // Handle post-signup welcome
  useEffect(() => {
    if (searchParams.get('welcome') === 'true') {
      setShowWelcome(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      router.replace(url.pathname + url.search, { scroll: false })
    }
  }, [searchParams, router])

  const handleGenerate = async (overrideSpeaker?: string, overrideFile?: File) => {
    const activeSpeaker = overrideSpeaker ?? speakerName
    const activeFile = overrideFile ?? file
    if (!activeSpeaker || !activeFile) return

    setIsLoading(true)
    setDone(false)
    setError(null)
    pendingSessionIdRef.current = null

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired — please sign in again.')
        toast.error('Session expired — please sign in again.')
        return
      }
      const storagePath = await uploadTempZip(user.id, activeFile)
      const res = await fetch(ROUTES.API_PROCESS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerName: activeSpeaker, storagePath }),
      })
      let data: Record<string, unknown> = {}
      try {
        data = await res.json()
      } catch {
        setError('Upload failed — the file may be too large or the server timed out.')
        toast.error('Upload failed — the file may be too large or the server timed out.')
        return
      }

      if (!res.ok) {
        if (data.error === 'subscription_required') {
          // Subscription expired between page load and submit — refresh and show paywall
          refreshSubscription()
          setError('Your subscription is required to generate sessions. Please subscribe to continue.')
          return
        }
        // ProcessingView watches `error` and handles its own fade-out before calling onExited
        const errMsg = (data.error as string) || 'Failed to process files'
        setError(errMsg)
        toast.error(errMsg)
        return
      }

      sessionStorage.setItem(`session_${data.sessionId}`, data.output as string)
      sessionStorage.setItem(`overlap_${data.sessionId}`, JSON.stringify(data.overlappingThemes ?? []))
      pendingSessionIdRef.current = data.sessionId as string
      setDone(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(message)
      toast.error(message)
    }
  }

  const handleUseTestData = async () => {
    try {
      const res = await fetch('/mock-questions.zip')
      const blob = await res.blob()
      const testFile = new File([blob], 'mock-questions.zip', { type: 'application/zip' })
      const testSpeaker = 'Demo Speaker'
      setSpeakerName(testSpeaker)
      setFile(testFile)
      await handleGenerate(testSpeaker, testFile)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load test data'
      setError(message)
      toast.error(message)
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
    return <PaywallModal reason={reason} onClose={() => router.push(ROUTES.HISTORY)} />
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
          {/* Checkout success banner */}
          {checkoutSuccess && (
            <div
              className="animate-fade-up p-4 rounded-lg text-sm font-[family-name:var(--font-dm-sans)]"
              style={{
                background: 'rgba(15, 107, 55, 0.12)',
                border: '1px solid rgba(15, 107, 55, 0.25)',
                color: '#4ade80',
              }}
            >
              Subscription activated! You&apos;re all set to generate sessions.
            </div>
          )}

          {/* Welcome card for first-time signups */}
          {showWelcome && (
            <div
              className="animate-fade-up p-5 rounded-xl border text-sm font-[family-name:var(--font-dm-sans)]"
              style={{
                background: 'rgba(84, 39, 133, 0.08)',
                borderColor: 'rgba(84, 39, 133, 0.25)',
              }}
            >
              <h3 className="font-semibold text-[var(--text-primary)] text-base mb-1 font-[family-name:var(--font-playfair)]">
                Welcome to MGMT 305!
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                Your 3-day free trial is active. Upload your first Canvas ZIP to generate a question sheet.
              </p>
              <button
                onClick={() => setShowWelcome(false)}
                className="mt-3 text-xs font-bold hover:underline font-[family-name:var(--font-dm-sans)]"
                style={{ color: BRAND.PURPLE }}
              >
                Got it
              </button>
            </div>
          )}

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

          <div className="animate-fade-up-delay-1">
            <SystemPromptEditor compact defaultExpanded={false} />
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
            <div className="pt-1 border-t border-[var(--border)]">
              <a
                href="/mock-questions.zip"
                download="mock-questions.zip"
                className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-150 font-[family-name:var(--font-dm-sans)]"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download sample ZIP to see the expected format
              </a>
            </div>
          </div>

          {/* Generate button */}
          <button
            disabled={!speakerName || !file || isLoading}
            onClick={() => handleGenerate()}
            className="animate-fade-up-delay-2 w-full py-4 rounded-xl bg-brand-orange text-white font-semibold text-base hover:bg-[#d85e18] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 font-[family-name:var(--font-dm-sans)] hover:shadow-[0_4px_20px_rgba(243,111,33,0.3)]"
          >
            Generate Question Sheet
          </button>

          {/* Test data shortcut */}
          <div className="animate-fade-up-delay-2 text-center">
            <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
              Just exploring?{' '}
            </span>
            <button
              onClick={handleUseTestData}
              disabled={isLoading}
              className="text-xs font-medium underline underline-offset-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 font-[family-name:var(--font-dm-sans)]"
            >
              Use test data
            </button>
          </div>
        </>
      )}
    </div>
  )
}
