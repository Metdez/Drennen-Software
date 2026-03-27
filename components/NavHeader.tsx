"use client"

import { SemesterSelector } from '@/components/SemesterSelector'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email)
    })
  }, [supabase])

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

        {email && (
          <span className="text-xs text-[var(--text-muted)] max-w-[180px] truncate">
            {email}
          </span>
        )}

        <div className="w-px h-4 bg-[var(--border-accent)]" />

        <button
          onClick={handleSignOut}
          className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-200"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
