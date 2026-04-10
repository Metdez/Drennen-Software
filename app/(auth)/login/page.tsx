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

        {/* Bottom: tagline */}
        <div className="text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
          Synthesizing student questions into<br />moderator-ready interview sheets.
        </div>
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
