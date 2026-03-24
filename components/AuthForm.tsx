'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ROUTES } from '@/lib/constants'

export function AuthForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  async function handleGoogleLogin() {
    setError(null)
    setSuccess(null)
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + ROUTES.API_AUTH_CALLBACK,
      },
    })
    if (oauthError) {
      setError(oauthError.message)
    }
  }

  async function handleEmailSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      const supabase = createClient()

      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + ROUTES.API_AUTH_CALLBACK,
          },
        })

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        setSuccess('Account created! You can now sign in.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          setError(signInError.message)
          return
        }

        router.push(ROUTES.DASHBOARD)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function toggleMode() {
    setMode(mode === 'signin' ? 'signup' : 'signin')
    setError(null)
    setSuccess(null)
  }

  return (
    <div className="w-full space-y-5 animate-fade-up">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-accent)] w-fit">
        <button
          type="button"
          onClick={() => { if (mode !== 'signin') toggleMode() }}
          className={
            mode === 'signin'
              ? 'bg-[#f36f21] text-white rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 font-[family-name:var(--font-dm-sans)]'
              : 'text-[var(--text-secondary)] px-4 py-1.5 text-sm transition-all duration-200 font-[family-name:var(--font-dm-sans)]'
          }
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { if (mode !== 'signup') toggleMode() }}
          className={
            mode === 'signup'
              ? 'bg-[#f36f21] text-white rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 font-[family-name:var(--font-dm-sans)]'
              : 'text-[var(--text-secondary)] px-4 py-1.5 text-sm transition-all duration-200 font-[family-name:var(--font-dm-sans)]'
          }
        >
          Sign up
        </button>
      </div>

      {/* Email/password form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block font-[family-name:var(--font-dm-sans)] uppercase tracking-wider"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-lg text-sm bg-[var(--surface-elevated)] border border-[var(--border-accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] focus:ring-1 focus:ring-[rgba(243,111,33,0.4)] transition-all duration-200 font-[family-name:var(--font-dm-sans)]"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block font-[family-name:var(--font-dm-sans)] uppercase tracking-wider"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-lg text-sm bg-[var(--surface-elevated)] border border-[var(--border-accent)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#f36f21] focus:ring-1 focus:ring-[rgba(243,111,33,0.4)] transition-all duration-200 font-[family-name:var(--font-dm-sans)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-[#f36f21] text-white font-semibold text-sm hover:bg-[#d85e18] hover:shadow-[0_4px_16px_rgba(243,111,33,0.25)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed font-[family-name:var(--font-dm-sans)]"
        >
          {loading
            ? (mode === 'signin' ? 'Signing in...' : 'Signing up...')
            : (mode === 'signin' ? 'Sign in with Email' : 'Sign up with Email')}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-[var(--border-accent)]" />
        <span className="text-[var(--text-muted)] text-xs font-[family-name:var(--font-dm-sans)]">or</span>
        <div className="flex-1 border-t border-[var(--border-accent)]" />
      </div>

      {/* Google OAuth button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full py-3 rounded-lg border border-[var(--border-accent)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--text-primary)] transition-all duration-200 text-sm font-medium font-[family-name:var(--font-dm-sans)] flex items-center justify-center gap-3"
      >
        {/* Google G icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
      </button>

      {/* Error message */}
      {error && (
        <div className="mt-3 p-3 rounded-lg bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.25)] text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mt-3 p-3 rounded-lg bg-[rgba(15,107,55,0.15)] border border-[rgba(15,107,55,0.3)] text-green-400 text-sm font-[family-name:var(--font-dm-sans)]">
          {success}
        </div>
      )}
    </div>
  )
}
