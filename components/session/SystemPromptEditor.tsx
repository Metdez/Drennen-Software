'use client'

/**
 * @file SystemPromptEditor.tsx
 * Collapsible editor for managing custom AI system prompt versions.
 *
 * Rendered by:
 *   - app/(app)/dashboard/page.tsx (compact=false, no sessionId — create flow)
 *   - app/(app)/preview/page.tsx (with sessionId — enables Re-run Session button)
 *
 * Calls:
 *   GET  /api/system-prompts               — loads versions + active prompt on mount
 *   POST /api/system-prompts               — saves the current textarea text as a new immutable version
 *   POST /api/system-prompts/reset         — resets the active prompt to the built-in default
 *   PATCH /api/system-prompts/[id]/activate — activates a previously saved version
 *   POST /api/sessions/[id]/rerun          — re-generates the session with the current active prompt
 *
 * Architecture:
 *   - The built-in default prompt lives in lib/ai/prompt.ts (version-controlled).
 *   - Custom versions are stored immutably in the `custom_system_prompts` table.
 *   - `sessions.prompt_version_id = NULL` means the built-in default was used.
 *   - `isDirty` tracks whether the textarea differs from the currently loaded version.
 *   - On re-run success, the new session's output is written to sessionStorage
 *     (`session_{newSessionId}`) before calling `onRerun` so the preview page
 *     can read it without an extra API round-trip.
 */

import { useEffect, useState } from 'react'
import { BRAND, ROUTES } from '@/lib/constants'
import { validateCustomPrompt } from '@/lib/ai/prompt'
import type { SystemPrompt } from '@/types'

/**
 * Defines the props accepted by the SystemPromptEditor component.
 * It is used to pass configuration and callback functions to the editor, controlling its initial state, layout, and behavior for session re-runs.
 *
 * `defaultExpanded`: Controls the initial expanded state of the editor. Defaults to `false`.
 * `compact`: When `true`, hides the version history sidebar, useful for space-constrained layouts.
 * `sessionId`: If provided, enables the "Re-run Session" button, linking the editor to a specific session.
 * `onRerun`: A callback function invoked with the new session ID after a successful session re-run.
 */
interface SystemPromptEditorProps {
  /** Whether the editor panel starts expanded. Defaults to `false`. */
  defaultExpanded?: boolean
  /**
   * When `true`, hides the version history sidebar (useful in space-constrained
   * layouts like the dashboard upload form).
   */
  compact?: boolean
  /** If provided, enables the "Re-run Session" button to re-generate this session. */
  sessionId?: string
  /** Called with the new session ID after a successful re-run. */
  onRerun?: (newSessionId: string) => void
}

/**
 * Represents the structure of the data expected from the `/api/system-prompts` API endpoint.
 * It is used to type-safely handle the response when fetching system prompt versions and the currently active prompt from the backend.
 *
 * Includes a list of `versions` (SystemPrompt[]), the `activeVersion` (SystemPrompt | null, null if default is active), and the `defaultPrompt` text (string), which is the built-in prompt text fetched from the server.
 */
interface PromptResponse {
  versions: SystemPrompt[]
  activeVersion: SystemPrompt | null
  defaultPrompt: string
}

/**
 * A discriminated union type that tracks whether the prompt text currently displayed in the editor textarea originates from the built-in default prompt or a specific custom prompt version.
 * It is used to accurately determine the "dirty" state of the editor (`isDirty`). By knowing the source, the component can compare the current `promptText` against the correct baseline (either `defaultPrompt` or a specific `SystemPrompt.promptText`).
 *
 * `type: 'default'` signifies the built-in default prompt is loaded. `type: 'version'; id: string` signifies a specific custom version identified by its ID is loaded.
 */
type LoadedSource =
  | { type: 'default' }
  | { type: 'version'; id: string }

/**
 * Formats an ISO date string into a human-readable date string.
 * It is used to display the creation date of custom system prompt versions in a user-friendly format within the version history sidebar.
 *
 * Uses `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` to format the date. Accepts an ISO date string as input.
 */
function formatPromptDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Collapsible system prompt management panel.
 *
 * State model:
 * - `versions`       — all saved custom prompt versions for this professor
 * - `activeVersion`  — the currently active version (null = built-in default is active)
 * - `defaultPrompt`  — the built-in prompt text from lib/ai/prompt.ts (server-fetched)
 * - `promptText`     — the current textarea value (may differ from any saved version)
 * - `loadedSource`   — tracks which version is loaded in the editor so `isDirty` can compare
 *
 * `isDirty` is true when `promptText !== loadedText` (the saved text of the loaded version).
 * The Save button is disabled until dirty AND valid (per `validateCustomPrompt`).
 */
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

  /**
   * Prompts for an optional version label, then POSTs the current textarea text
   * as a new immutable prompt version and reloads state.
   * Calls: POST /api/system-prompts
   */
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
    } finally {
      setSaving(false)
    }
  }

  /**
   * Resets the active prompt to the built-in default (clears any active custom version).
   * Calls: POST /api/system-prompts/reset
   */
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
    } finally {
      setSaving(false)
    }
  }

  /**
   * Activates a saved custom version (versionId != null) or resets to the default (null).
   * Calls: PATCH /api/system-prompts/[id]/activate  OR  POST /api/system-prompts/reset
   */
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
    } finally {
      setSaving(false)
    }
  }

  /**
   * Re-runs the current session with the active prompt.
   * On success, writes the new output to sessionStorage so the preview page can
   * read it without a redundant API call, then invokes `onRerun` with the new session ID.
   * Calls: POST /api/sessions/[id]/rerun
   */
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
        // Pre-seed sessionStorage so the preview page renders immediately without a fetch.
        sessionStorage.setItem(`session_${data.sessionId}`, data.output)
      }
      onRerun?.(data.sessionId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rerun session.'
      setError(message)
    } finally {
      setRerunning(false)
    }
  }

  /**
   * Loads a saved version (or the default) into the editor textarea without saving.
   * Sets `loadedSource` so `isDirty` can compare against the right baseline.
   *
   * @param version - The version to load, or `null` to load the built-in default.
   */
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
