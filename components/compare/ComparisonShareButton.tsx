'use client'

import { useState } from 'react'
import { ROUTES } from '@/lib/constants'

interface ComparisonShareButtonProps {
  comparisonId: string | null
}

export function ComparisonShareButton({ comparisonId }: ComparisonShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (!comparisonId) return null

  async function handleShare() {
    setSharing(true)
    try {
      const res = await fetch(ROUTES.API_COMPARE_SHARE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comparisonId }),
      })
      const data = await res.json()
      if (data.shareUrl) {
        setShareUrl(data.shareUrl)
        await navigator.clipboard.writeText(data.shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('Failed to share comparison:', err)
    } finally {
      setSharing(false)
    }
  }

  async function handleRevoke() {
    try {
      await fetch(ROUTES.API_COMPARE_SHARE, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comparisonId }),
      })
      setShareUrl(null)
    } catch (err) {
      console.error('Failed to revoke sharing:', err)
    }
  }

  if (shareUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          {copied ? 'Link copied!' : 'Shared'}
        </span>
        <button
          onClick={handleRevoke}
          className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400/30 transition-colors font-[family-name:var(--font-dm-sans)]"
        >
          Stop sharing
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      className="px-3 py-1 rounded-full text-xs font-semibold border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-[#f36f21] hover:border-[#f36f21]/30 transition-colors font-[family-name:var(--font-dm-sans)] disabled:opacity-50"
    >
      {sharing ? 'Sharing...' : 'Share'}
    </button>
  )
}
