'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthForm } from '@/components/layout/AuthForm'

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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
