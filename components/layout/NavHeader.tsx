"use client"

/**
 * @file NavHeader.tsx
 * Top navigation bar rendered across all authenticated (app) pages.
 *
 * Rendered by: app/(app)/layout.tsx
 * Uses: lib/supabase/client.ts — reads the current session to display the professor's email
 * Reads: Supabase Auth session (browser, cookie-based)
 *
 * Contains:
 * - Brand wordmark ("MGMT 305")
 * - Primary nav links (Dashboard, History, Roster, Analytics)
 * - SemesterSelector — semester-scoped context switcher
 * - Account dropdown: avatar with initials, My Account, Share Portfolio, Sign Out
 */

import { SemesterSelector } from '@/components/semester/SemesterSelector'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

/** Static top-level nav links. Active state is derived from `usePathname()`. */
const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'History', href: '/history' },
  { label: 'Roster', href: '/roster' },
  { label: 'Analytics', href: '/analytics' },
]

/**
 * Persistent top navigation bar for the authenticated app shell.
 *
 * Side effects:
 * - On mount: fetches the Supabase session to populate the avatar initials and
 *   truncated email address in the account dropdown.
 * - Registers a `mousedown` document listener to close the account dropdown
 *   when the user clicks outside it (cleaned up when dropdown closes).
 */
export function NavHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [email, setEmail] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch the current user's email once on mount for display in the avatar/dropdown.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email)
    })
  }, [supabase])

  // Close the dropdown menu when the user clicks anywhere outside it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /** Signs the user out via Supabase and navigates to the login page. */
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[var(--surface)] border-b border-[var(--border-accent)]">
      <div className="font-[family-name:var(--font-playfair)] font-bold text-xl">
        <span className="text-[var(--text-primary)]">MGMT </span>
        <span className="text-[#f36f21]">305</span>
      </div>

      <div className="flex items-center gap-6">
        {NAV_LINKS.map(({ label, href }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'text-[#f36f21]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </Link>
          )
        })}

        <SemesterSelector />

        <div className="w-px h-4 bg-[var(--border-accent)]" />

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-all duration-200 hover:bg-[var(--surface-elevated)] group"
            title={email ?? 'Account'}
          >
            {/* Avatar circle — first letter of email, falls back to "A" before session loads */}
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#f36f21]/20 text-[#f36f21] text-xs font-semibold shrink-0 group-hover:bg-[#f36f21]/30 transition-colors duration-200">
              {email ? email[0].toUpperCase() : 'A'}
            </span>
            {/* Truncated email */}
            <span className="text-xs text-[var(--text-muted)] max-w-[120px] truncate group-hover:text-[var(--text-secondary)] transition-colors duration-200">
              {email ?? 'Account'}
            </span>
            {/* Chevron */}
            <svg
              className={`w-3 h-3 text-[var(--text-muted)] shrink-0 transition-transform duration-200 group-hover:text-[var(--text-secondary)] ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-lg shadow-xl z-40 overflow-hidden"
              style={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
              }}
            >
              <Link
                href="/account"
                onClick={() => setDropdownOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                My Account
              </Link>
              <Link
                href="/account#portfolio"
                onClick={() => setDropdownOpen(false)}
                className="block w-full text-left px-4 py-2 text-sm transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                Share Portfolio
              </Link>
              <button
                onClick={() => {
                  setDropdownOpen(false)
                  handleSignOut()
                }}
                className="block w-full text-left px-4 py-2 text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--surface-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
