'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSemesterContext } from '@/components/semester/SemesterContext'
import { BRAND, ROUTES } from '@/lib/constants'
import type { PortfolioConfig } from '@/types'
import { DEFAULT_PORTFOLIO_CONFIG } from '@/types/portfolio'

export function PortfolioSharePanel() {
  const { semesters } = useSemesterContext()

  const [exists, setExists] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [config, setConfig] = useState<PortfolioConfig>(DEFAULT_PORTFOLIO_CONFIG)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(ROUTES.API_PORTFOLIO)
      if (!res.ok) return
      const data = await res.json()
      setExists(data.exists)
      if (data.exists) {
        setEnabled(data.enabled)
        setConfig({ ...DEFAULT_PORTFOLIO_CONFIG, ...data.config })
        setShareUrl(`${window.location.origin}/portfolio/${data.shareToken}`)
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchState()
  }, [fetchState])

  async function handleCreate() {
    setBusy(true)
    try {
      const res = await fetch(ROUTES.API_PORTFOLIO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setExists(true)
      setEnabled(data.enabled)
      setShareUrl(data.shareUrl)
      setConfig(data.config)
    } catch {
      alert('Failed to create portfolio link.')
    } finally {
      setBusy(false)
    }
  }

  async function handleToggle(newEnabled: boolean) {
    setBusy(true)
    try {
      const res = await fetch(ROUTES.API_PORTFOLIO, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEnabled(data.enabled)
    } catch {
      alert('Failed to update sharing.')
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdateConfig(newConfig: PortfolioConfig) {
    setConfig(newConfig)
    if (!exists) return
    setBusy(true)
    try {
      const res = await fetch(ROUTES.API_PORTFOLIO, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      })
      if (!res.ok) throw new Error()
    } catch {
      alert('Failed to update config.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRegenerate() {
    setBusy(true)
    setConfirmRegen(false)
    try {
      const res = await fetch(ROUTES.API_PORTFOLIO, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setShareUrl(data.shareUrl)
    } catch {
      alert('Failed to regenerate link.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  if (loading) {
    return (
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
      >
        <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)] mb-4">
          Portfolio Sharing
        </h2>
        <p className="text-sm font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
          Loading...
        </p>
      </div>
    )
  }

  return (
    <div
      id="portfolio"
      className="rounded-xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-accent)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-[var(--text-primary)]">
          Portfolio Sharing
        </h2>
        {exists && (
          <button
            onClick={() => handleToggle(!enabled)}
            disabled={busy}
            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 disabled:opacity-40"
            style={{ backgroundColor: enabled ? BRAND.GREEN : 'var(--surface-hover)' }}
          >
            <span
              className="inline-block h-4 w-4 rounded-full bg-white transition-transform duration-200"
              style={{ transform: enabled ? 'translateX(1.375rem)' : 'translateX(0.25rem)' }}
            />
          </button>
        )}
      </div>

      <p className="text-sm mb-5 font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-secondary)' }}>
        Generate a single link that gives read-only access to your entire portfolio — sessions, analytics, roster, and reports.
      </p>

      {/* Config section */}
      <div className="flex flex-col gap-4 mb-5">
        {/* Scope */}
        <div>
          <label className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
            Scope
          </label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 text-sm font-[family-name:var(--font-dm-sans)] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="radio"
                name="scope"
                checked={config.scope === 'all'}
                onChange={() => handleUpdateConfig({ ...config, scope: 'all', semesterId: null })}
                className="accent-[#f36f21]"
              />
              All semesters
            </label>
            <label className="flex items-center gap-2 text-sm font-[family-name:var(--font-dm-sans)] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="radio"
                name="scope"
                checked={config.scope === 'semester'}
                onChange={() => {
                  const active = semesters.find(s => s.status === 'active')
                  handleUpdateConfig({ ...config, scope: 'semester', semesterId: active?.id ?? semesters[0]?.id ?? null })
                }}
                disabled={semesters.length === 0}
                className="accent-[#f36f21]"
              />
              Specific semester
            </label>
          </div>
          {config.scope === 'semester' && semesters.length > 0 && (
            <select
              value={config.semesterId ?? ''}
              onChange={(e) => handleUpdateConfig({ ...config, semesterId: e.target.value || null })}
              className="mt-2 text-sm rounded-lg px-3 py-2 font-[family-name:var(--font-dm-sans)]"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border-accent)',
                color: 'var(--text-secondary)',
              }}
            >
              {semesters.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.status === 'active' ? '(Active)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Include options */}
        <div>
          <label className="text-xs uppercase tracking-wide font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: 'var(--text-muted)' }}>
            Include
          </label>
          <div className="flex flex-col gap-2 mt-2">
            <label className="flex items-center gap-2 text-sm font-[family-name:var(--font-dm-sans)] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={config.includeStudentProfiles}
                onChange={(e) => handleUpdateConfig({ ...config, includeStudentProfiles: e.target.checked })}
                className="accent-[#f36f21]"
              />
              Student profiles & roster
            </label>
            <label className="flex items-center gap-2 text-sm font-[family-name:var(--font-dm-sans)] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={config.includeReports}
                onChange={(e) => handleUpdateConfig({ ...config, includeReports: e.target.checked })}
                className="accent-[#f36f21]"
              />
              Semester reports
            </label>
          </div>
        </div>
      </div>

      {/* Create / Link section */}
      {!exists ? (
        <button
          onClick={handleCreate}
          disabled={busy}
          className="text-sm font-semibold rounded-xl px-5 py-2.5 text-white transition-all duration-200 hover:bg-[#d85e18] font-[family-name:var(--font-dm-sans)] disabled:opacity-40"
          style={{ backgroundColor: BRAND.ORANGE }}
        >
          {busy ? 'Creating...' : 'Generate Portfolio Link'}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Link display */}
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={enabled ? (shareUrl ?? '') : 'Sharing disabled'}
              className="flex-1 text-xs bg-[var(--bg)] border border-[var(--border-accent)] rounded-lg px-3 py-2 font-[family-name:var(--font-dm-sans)] select-all"
              style={{ color: enabled ? 'var(--text-secondary)' : 'var(--text-muted)' }}
              onFocus={(e) => e.target.select()}
            />
            <button
              onClick={handleCopy}
              disabled={!enabled || busy}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 font-[family-name:var(--font-dm-sans)] disabled:opacity-40 ${
                copied
                  ? 'bg-[rgba(15,107,55,0.15)] text-[#5e9e6e]'
                  : 'bg-[#f36f21] text-white hover:bg-[#d85e18]'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Regenerate */}
          <div className="flex items-center gap-3">
            {!confirmRegen ? (
              <button
                onClick={() => setConfirmRegen(true)}
                disabled={busy}
                className="text-xs text-red-400 hover:text-red-300 transition-colors font-[family-name:var(--font-dm-sans)] disabled:opacity-40"
              >
                Regenerate link (revokes current)
              </button>
            ) : (
              <>
                <span className="text-xs text-red-400 font-[family-name:var(--font-dm-sans)]">
                  This will invalidate the current link. Continue?
                </span>
                <button
                  onClick={handleRegenerate}
                  disabled={busy}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 font-[family-name:var(--font-dm-sans)]"
                >
                  Yes, regenerate
                </button>
                <button
                  onClick={() => setConfirmRegen(false)}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
