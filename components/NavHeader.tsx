"use client"

import { SemesterSelector } from '@/components/SemesterSelector'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'History', href: '/history' },
  { label: 'Roster', href: '/roster' },
  { label: 'Analytics', href: '/analytics' },
]

export function NavHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [email, setEmail] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email)
    })
  }, [supabase])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
            className="text-xs text-[var(--text-muted)] max-w-[180px] truncate hover:text-[var(--text-secondary)] transition-colors duration-200"
          >
            {email ?? 'Account'}
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
