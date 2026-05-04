/**
 * Login page (`/login`).
 *
 * Route group: `(auth)` — no NavHeader or subscription context.
 * Auth: unauthenticated only; authenticated users are redirected to
 * `/dashboard` by the root `app/page.tsx` before reaching this page.
 *
 * Layout: two-column on desktop (decorative left panel + auth form on
 * right), single-column on mobile (left panel hidden via `lg:hidden`).
 *
 * Modes: `signin` | `signup` — toggled by `AuthForm` via `onModeChange`.
 * The `?error=...` query param is set by `app/api/auth/callback/route.ts`
 * when the Supabase PKCE exchange fails; displayed as an inline error banner.
 *
 * Wrapped in `<Suspense>` because `useSearchParams` requires a suspense
 * boundary when used inside a Client Component in the App Router.
 *
 * Components: AuthForm
 */
'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/layout/AuthForm'

/**
 * What it does
 * This client component renders the main content for the login/signup page, featuring a two-panel layout that presents application branding alongside the authentication form.
 *
 * Why it is used
 * It provides the user interface for authenticating users (login or signup) and visually differentiates the application's identity. It is separated from the root `LoginPage` component to leverage client-side hooks like `useState` and `useSearchParams` within a `Suspense` boundary.
 *
 * Important implementation details
 * - Uses `useState` to manage the `mode` between 'signin' and 'signup', which dictates the text and behavior of the authentication form.
 * - Utilizes `useSearchParams` from `next/navigation` to detect and display `callbackError` messages, typically from failed authentication attempts via external providers.
 * - Implements a responsive layout with a hidden left panel on `lg` (large) screens and below, showcasing branding information.
 * - Integrates the `AuthForm` component, passing the current `mode` and a `setMode` handler to allow the form to switch between signin and signup views.
 * - Employs Tailwind CSS classes extensively for styling and layout, along with CSS variables for theming (`--bg`, `--border-accent`, etc.).
 * - Dynamically adjusts header text and displays a small descriptive paragraph based on the current authentication `mode`.
 */
function LoginContent() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const searchParams = useSearchParams()
  const callbackError = searchParams.get('error')

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* LEFT PANEL — hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-16 relative overflow-hidden border-r border-[var(--border-accent)]">
        {/* Subtle radial glow at bottom-left */}
        <div
          className="absolute bottom-0 left-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(243,111,33,0.08) 0%, transparent 70%)' }}
        />

        {/* Top: small label */}
        <div className="text-[var(--text-muted)] text-xs uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
          Management 305
        </div>

        {/* Center: giant typographic statement */}
        <div>
          <div className="font-[family-name:var(--font-playfair)] leading-none select-none">
            <div className="text-[clamp(5rem,10vw,9rem)] font-bold text-[var(--text-primary)] opacity-90">MGMT</div>
            <div className="text-[clamp(5rem,10vw,9rem)] font-bold text-[#f36f21]">305</div>
          </div>
          <p className="mt-6 text-[var(--text-secondary)] text-lg font-[family-name:var(--font-dm-sans)] max-w-xs leading-relaxed">
            Guest Speaker Intelligence System
          </p>
          <div className="mt-4 h-px w-16 bg-[#f36f21] opacity-60" />
        </div>

        {/* Bottom: sample data callout card */}
        <a
          href="/mock-questions.zip"
          download="mock-questions.zip"
          className="group block rounded-2xl p-6 transition-all duration-200 hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(243,111,33,0.15) 0%, rgba(243,111,33,0.05) 100%)',
            border: '1px solid rgba(243,111,33,0.35)',
          }}
        >
          {/* Top row: icon + label */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(243,111,33,0.2)', border: '1px solid rgba(243,111,33,0.35)' }}
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="#f36f21" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="12" x2="12" y2="18" />
                <polyline points="9 15 12 18 15 15" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: '#f36f21' }}>
                Try it first
              </p>
              <p className="text-base font-bold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] leading-tight mt-0.5">
                Download sample questions
              </p>
            </div>
          </div>

          <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-4">
            Mock student questions we made up — sign in and upload to see the full pipeline in action.
          </p>

          {/* Download CTA row */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium font-[family-name:var(--font-dm-sans)]" style={{ color: '#f36f21' }}>
              mock-questions.zip
            </span>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-[family-name:var(--font-dm-sans)] transition-colors duration-150 group-hover:bg-[#f36f21] group-hover:text-white"
              style={{ background: 'rgba(243,111,33,0.15)', color: '#f36f21', border: '1px solid rgba(243,111,33,0.3)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download
            </div>
          </div>
        </a>
      </div>

      {/* RIGHT PANEL — auth form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile header (shows when left panel is hidden) */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-bold">
              MGMT <span style={{ color: '#f36f21' }}>305</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-sm mt-2 font-[family-name:var(--font-dm-sans)]">
              Guest Speaker Question Generator
            </p>
          </div>

          {/* Card */}
          <div
            className="p-8 rounded-2xl border border-[var(--border-accent)]"
            style={{ background: 'var(--surface)' }}
          >
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-semibold mb-1 text-[var(--text-primary)]">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            {mode === 'signup' && (
              <p className="text-sm text-[var(--text-secondary)] mb-5 font-[family-name:var(--font-dm-sans)]">
                Start with a 3-day free trial. No credit card required.
              </p>
            )}
            {mode === 'signin' && <div className="mb-5" />}

            {callbackError && (
              <div className="mb-4 p-3 rounded-lg bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.25)] text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
                Authentication failed. Please try again.
              </div>
            )}

            <AuthForm mode={mode} onModeChange={setMode} />
          </div>

          {/* Mobile-only sample download */}
          <a
            href="/mock-questions.zip"
            download="mock-questions.zip"
            className="lg:hidden group mt-4 block rounded-2xl border border-[var(--border-accent)] p-4 hover:border-[rgba(243,111,33,0.5)] transition-all duration-200"
            style={{ background: 'var(--surface)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(243,111,33,0.12)', border: '1px solid rgba(243,111,33,0.2)' }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#f36f21" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="12" x2="12" y2="18" />
                  <polyline points="9 15 12 18 15 15" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">Download sample data</p>
                <p className="text-xs text-[#f36f21] font-[family-name:var(--font-dm-sans)]">mock-questions.zip</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

/**
 * What it does
 * This is the root page component for the `/login` route. It serves as the entry point for the authentication section of the application.
 *
 * Why it is used
 * It provides the necessary Next.js page structure for the `/login` route. The primary reason for its existence is to wrap the `LoginContent` component in a `Suspense` boundary. This is crucial because `LoginContent` uses `useSearchParams`, a client-side hook that relies on the browser's URL context. Wrapping it in `Suspense` prevents potential hydration errors when server-side rendering is active, ensuring the component only fully renders on the client after initial HTML is streamed.
 *
 * Important implementation details
 * - It is exported as the default component, making it the primary component rendered when navigating to the `/login` path within the application.
 * - It contains a single `Suspense` boundary that wraps `LoginContent`. This pattern is essential for client components that use hooks like `useSearchParams` or other client-side APIs that are not available during server rendering.
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
