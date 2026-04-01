'use client'

import { useEffect, useState } from 'react'
import { BRAND, ROUTES } from '@/lib/constants'
import { validateCustomPrompt } from '@/lib/ai/prompt'
import type { SystemPrompt } from '@/types'

interface SystemPromptEditorProps {
  defaultExpanded?: boolean
  compact?: boolean
  sessionId?: string
  onRerun?: (newSessionId: string) => void
}

interface PromptResponse {
  versions: SystemPrompt[]
  activeVersion: SystemPrompt | null
  defaultPrompt: string
}

type LoadedSource =
  | { type: 'default' }
  | { type: 'version'; id: string }

function formatPromptDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SystemPromptEditor({
  defaultExpanded = false,
  compact = false,
  sessionId,
  onRerun,
}: SystemPromptEditorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [versions, setVersions] = useState<SystemPrompt[]>([])
  const [activeVersion, setActiveVersion] = useState<SystemPrompt | null>(null)
  const [defaultPrompt, setDefaultPrompt] = useState('')
  const [promptText, setPromptText] = useState('')
  const [loadedSource, setLoadedSource] = useState<LoadedSource>({ type: 'default' })
  const [saving, setSaving] = useState(false)
  const [rerunning, setRerunning] = useState(false)

  async function loadPromptState() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SYSTEM_PROMPTS)
      const data = await res.json() as PromptResponse | { error?: string }
      if (!res.ok || !('versions' in data)) {
        throw new Error(('error' in data && data.error) || 'Failed to load system prompts.')
      }

      setVersions(data.versions)
      setActiveVersion(data.activeVersion)
      setDefaultPrompt(data.defaultPrompt)

      if (data.activeVersion) {
        setPromptText(data.activeVersion.promptText)
        setLoadedSource({ type: 'version', id: data.activeVersion.id })
      } else {
        setPromptText(data.defaultPrompt)
        setLoadedSource({ type: 'default' })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load system prompts.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPromptState()
  }, [])

  const loadedText = loadedSource.type === 'default'
    ? defaultPrompt
    : versions.find((version) => version.id === loadedSource.id)?.promptText ?? ''

  const isDirty = promptText !== loadedText
  const validation = validateCustomPrompt(promptText)
  const activeBadge = activeVersion ? `v${activeVersion.version} active` : 'Default active'

  async function handleSave() {
    const labelInput = window.prompt('Optional label for this prompt version:', '')
    if (labelInput === null) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SYSTEM_PROMPTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText,
          label: labelInput.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save prompt version.')
      }
      await loadPromptState()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save prompt version.'
      setError(message)
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleResetToDefault() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SYSTEM_PROMPTS_RESET, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset prompt.')
      }
      await loadPromptState()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset prompt.'
      setError(message)
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleActivate(versionId: string | null) {
    setSaving(true)
    setError(null)
    try {
      const res = versionId
        ? await fetch(ROUTES.API_SYSTEM_PROMPT_ACTIVATE(versionId), { method: 'PATCH' })
        : await fetch(ROUTES.API_SYSTEM_PROMPTS_RESET, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate prompt.')
      }
      await loadPromptState()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to activate prompt.'
      setError(message)
      alert(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRerun() {
    if (!sessionId) return

    setRerunning(true)
    setError(null)
    try {
      const res = await fetch(ROUTES.API_SESSION_RERUN(sessionId), { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to rerun session.')
      }

      if (data.sessionId && data.output) {
        sessionStorage.setItem(`session_${data.sessionId}`, data.output)
      }
      onRerun?.(data.sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rerun session.'
      setError(message)
      alert(message)
    } finally {
      setRerunning(false)
    }
  }

  function loadVersion(version: SystemPrompt | null) {
    if (version) {
      setPromptText(version.promptText)
      setLoadedSource({ type: 'version', id: version.id })
      return
    }

    setPromptText(defaultPrompt)
    setLoadedSource({ type: 'default' })
  }

  return (
    <div
      className="rounded-3xl border p-5 sm:p-6"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border-accent)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
              System Prompt
            </h2>
            <span
              className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]"
              style={{
                background: activeVersion ? `${BRAND.PURPLE}15` : `${BRAND.GREEN}15`,
                color: activeVersion ? BRAND.PURPLE : BRAND.GREEN,
              }}
            >
              {activeBadge}
            </span>
          </div>
          <p className="mt-2 text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-secondary)]">
            Customize the AI instructions used to generate interview sheets.
          </p>
        </div>

        <button
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-semibold font-[family-name:var(--font-dm-sans)] transition-colors"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            background: 'var(--surface-elevated)',
          }}
        >
          <span>{expanded ? 'Hide' : 'Show'}</span>
          <span>{expanded ? '-' : '+'}</span>
        </button>
      </div>

      {expanded && (
        <div className={`mt-6 ${compact ? '' : 'lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6'}`}>
          <div className="min-w-0">
            {loading ? (
              <div className="rounded-2xl border px-4 py-12 text-center text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]" style={{ borderColor: 'var(--border)' }}>
                Loading prompt settings...
              </div>
            ) : (
              <>
                <div
                  className="rounded-2xl border"
                  style={{
                    borderColor: isDirty ? BRAND.ORANGE : 'var(--border)',
                    boxShadow: isDirty ? `inset 4px 0 0 ${BRAND.ORANGE}` : 'none',
                  }}
                >
                  <textarea
                    value={promptText}
                    onChange={(event) => setPromptText(event.target.value)}
                    spellCheck={false}
                    className="min-h-[420px] w-full resize-y rounded-2xl bg-transparent px-4 py-4 text-sm leading-6 text-[var(--text-primary)] outline-none font-mono"
                  />
                  <div className="flex items-center justify-end px-4 pb-4 text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    {promptText.trim().length} characters
                  </div>
                </div>

                {validation.warnings.length > 0 && (
                  <div
                    className="mt-4 rounded-2xl border px-4 py-3"
                    style={{
                      borderColor: '#d97706',
                      background: 'rgba(217, 119, 6, 0.08)',
                    }}
                  >
                    {validation.warnings.map((warning) => (
                      <p
                        key={warning}
                        className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]"
                      >
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-2xl border border-[rgba(220,38,38,0.25)] bg-[rgba(220,38,38,0.08)] px-4 py-3 text-sm font-[family-name:var(--font-dm-sans)] text-red-400">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || !validation.valid || !isDirty}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40 font-[family-name:var(--font-dm-sans)]"
                    style={{ background: BRAND.ORANGE }}
                  >
                    {saving ? 'Saving...' : 'Save as New Version'}
                  </button>

                  <button
                    onClick={handleResetToDefault}
                    disabled={saving || loading}
                    className="rounded-xl border px-4 py-2.5 text-sm font-semibold font-[family-name:var(--font-dm-sans)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                      background: 'var(--surface-elevated)',
                    }}
                  >
                    Reset to Default
                  </button>

                  {sessionId && (
                    <button
                      onClick={handleRerun}
                      disabled={rerunning}
                      className="rounded-xl border px-4 py-2.5 text-sm font-semibold font-[family-name:var(--font-dm-sans)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: `${BRAND.PURPLE}55`,
                        color: BRAND.PURPLE,
                        background: `${BRAND.PURPLE}10`,
                      }}
                    >
                      {rerunning ? 'Re-running...' : 'Re-run Session'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {!compact && !loading && (
            <div className="mt-6 lg:mt-0">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                Version History
              </h3>

              <div className="space-y-3">
                <button
                  onClick={() => loadVersion(null)}
                  className="w-full rounded-2xl border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: loadedSource.type === 'default' ? BRAND.GREEN : 'var(--border)',
                    background: loadedSource.type === 'default' ? `${BRAND.GREEN}10` : 'var(--surface-elevated)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                        Default
                      </p>
                      <p className="mt-1 text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                        Built-in prompt
                      </p>
                    </div>
                    {activeVersion === null ? (
                      <span
                        className="text-xs font-semibold font-[family-name:var(--font-dm-sans)]"
                        style={{ color: BRAND.GREEN }}
                      >
                        Active
                      </span>
                    ) : (
                      <span
                        onClick={(event) => {
                          event.stopPropagation()
                          handleActivate(null)
                        }}
                        className="text-xs font-semibold font-[family-name:var(--font-dm-sans)]"
                        style={{ color: BRAND.GREEN }}
                      >
                        Activate
                      </span>
                    )}
                  </div>
                </button>

                {versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => loadVersion(version)}
                    className="w-full rounded-2xl border px-4 py-3 text-left transition-colors"
                    style={{
                      borderColor: loadedSource.type === 'version' && loadedSource.id === version.id
                        ? BRAND.PURPLE
                        : 'var(--border)',
                      background: loadedSource.type === 'version' && loadedSource.id === version.id
                        ? `${BRAND.PURPLE}10`
                        : 'var(--surface-elevated)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                          v{version.version}{version.label ? ` - ${version.label}` : ''}
                        </p>
                        <p className="mt-1 text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                          {formatPromptDate(version.createdAt)}
                        </p>
                      </div>
                      {activeVersion?.id === version.id ? (
                        <span className="text-xs font-semibold font-[family-name:var(--font-dm-sans)]" style={{ color: BRAND.PURPLE }}>
                          Active
                        </span>
                      ) : (
                        <span
                          onClick={(event) => {
                            event.stopPropagation()
                            handleActivate(version.id)
                          }}
                          className="text-xs font-semibold font-[family-name:var(--font-dm-sans)]"
                          style={{ color: BRAND.PURPLE }}
                        >
                          Activate
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
