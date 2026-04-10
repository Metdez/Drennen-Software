/**
 * @file DownloadButtons.tsx
 * PDF and DOCX download action buttons for a session's interview sheet.
 *
 * Rendered by: app/(app)/preview/page.tsx (questions tab action bar)
 *              app/(public)/shared/[token]/page.tsx (read-only shared view)
 * Calls: GET /api/sessions/[id]/download?format=pdf|docx
 *        OR a custom `downloadUrl` override (used for shared sessions, brief downloads, etc.)
 *
 * Pattern: The API returns a binary blob; the component creates an ephemeral
 * `<a>` element with a Blob URL, clicks it to trigger the browser's native
 * Save dialog, then immediately revokes the URL to free memory.
 *
 * Error handling: failures surface inline below the buttons — `alert()` is never used.
 */

"use client"

import { useState } from 'react'

/**
 * Renders an SVG spinner icon.
 *
 * It is used to indicate a loading or processing state, specifically when a download operation is in progress.
 *
 * Uses Tailwind CSS classes (animate-spin h-4 w-4) for animation and sizing. The SVG elements define the classic circular loading spinner.
 */
const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

/**
 * Renders an SVG download icon.
 *
 * It is used to visually represent the download action on the buttons when they are in an idle state.
 *
 * Uses Tailwind CSS classes (h-4 w-4) for sizing. The SVG path defines a common download arrow icon.
 */
const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0l-4.5-4.5M12 16.5l4.5-4.5" />
  </svg>
)

/**
 * Renders PDF and Word download buttons for a session's interview sheet.
 *
 * @param sessionId   - Used to build the default download URL.
 * @param speakerName - Used to derive the downloaded filename (spaces → underscores).
 * @param downloadUrl - Optional callback that returns a URL string for a given format.
 *   When omitted, defaults to `/api/sessions/[sessionId]/download?format=...`.
 *   Shared-session pages pass a custom URL builder that routes through the public API.
 *   Note: Next.js emits a TS warning (71007) about non-Server-Action function props in
 *   "use client" files. This prop is a pure URL-builder called only on the client, not a
 *   server action, so the warning is a false positive and can be safely ignored.
 *
 * Only one format can be downloading at a time; both buttons are disabled while
 * a download is in flight to prevent double-clicks.
 */
/**
 * Renders PDF and Word download buttons for a session's interview sheet.
 *
 * It is used to provide users with options to download interview sheets in different formats (PDF, DOCX) for a given session.
 *
 * @param sessionId   - Used to build the default download URL.
 * @param speakerName - Used to derive the downloaded filename (spaces → underscores).
 * @param downloadUrl - Optional callback that returns a URL string for a given format.
 *   When omitted, defaults to `/api/sessions/[sessionId]/download?format=...`.
 *   Shared-session pages pass a custom URL builder that routes through the public API.
 *   Note: Next.js emits a TS warning (71007) about non-Server-Action function props in
 *   "use client" files. This prop is a pure URL-builder called only on the client, not a
 *   server action, so the warning is a false positive and can be safely ignored.
 *
 * Only one format can be downloading at a time; both buttons are disabled while
 * a download is in flight to prevent double-clicks.
 *
 * Important implementation details:
 * - Manages download state using `useState` hooks (`downloading` and `error`).
 * - The `handleDownload` function orchestrates the download process:
 *   - Constructs the fetch URL, prioritizing the `downloadUrl` prop if provided.
 *   - Fetches the file as a Blob.
 *   - Creates an ephemeral Blob URL.
 *   - Triggers the download by programmatically creating and clicking an `<a>` element.
 *   - Revokes the Blob URL immediately after the download is initiated to prevent memory leaks.
 * - Includes error handling and visual feedback for download failures.
 * - Disables both download buttons while any format is being downloaded to prevent concurrent operations.
 * - Dynamically switches between `SpinnerIcon` and `DownloadIcon` based on the download state.
 */
export function DownloadButtons({ sessionId, speakerName, downloadUrl }: { sessionId: string, speakerName: string, downloadUrl?: (format: 'pdf' | 'docx') => string }) {
  // Tracks which format (if any) is currently being downloaded; null = idle
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDownload(format: 'pdf' | 'docx') {
    setDownloading(format)
    setError(null)
    try {
      // Use the caller-supplied URL override if provided (e.g. for shared or brief downloads)
      const fetchUrl = downloadUrl ? downloadUrl(format) : `/api/sessions/${sessionId}/download?format=${format}`
      const res = await fetch(fetchUrl)
      if (!res.ok) throw new Error('Download failed')

      // Blob URL pattern: create an ephemeral object URL, trigger click, then immediately
      // revoke to avoid leaking memory — there is no persistent reference to keep alive.
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${speakerName.replace(/\s+/g, '_')}_Questions.${format === 'pdf' ? 'pdf' : 'docx'}`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
      setError('Failed to download file.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2 flex-wrap">
        {/* PDF button — primary orange pill */}
        <button
          onClick={() => handleDownload('pdf')}
          disabled={downloading !== null}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f36f21] text-white text-[0.8125rem] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:bg-[#d85e18] hover:shadow-[0_4px_16px_rgba(243,111,33,0.25)] hover:-translate-y-[1px] active:translate-y-0 font-[family-name:var(--font-dm-sans)]"
        >
          {downloading === 'pdf' ? <SpinnerIcon /> : <DownloadIcon />}
          {downloading === 'pdf' ? 'Generating...' : 'PDF'}
        </button>

        {/* DOCX button — subtle outlined */}
        <button
          onClick={() => handleDownload('docx')}
          disabled={downloading !== null}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[0.8125rem] font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-[1px] active:translate-y-0 font-[family-name:var(--font-dm-sans)] border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
          style={{ background: 'var(--surface)' }}
        >
          {downloading === 'docx' ? <SpinnerIcon /> : <DownloadIcon />}
          {downloading === 'docx' ? 'Generating...' : 'Word'}
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400 font-[family-name:var(--font-dm-sans)]">{error}</p>
      )}
    </div>
  )
}
