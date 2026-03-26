"use client"

import { useState } from 'react'

const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0l-4.5-4.5M12 16.5l4.5-4.5" />
  </svg>
)

export function DownloadButtons({ sessionId, speakerName, downloadUrl }: { sessionId: string, speakerName: string, downloadUrl?: (format: 'pdf' | 'docx') => string }) {
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null)

  async function handleDownload(format: 'pdf' | 'docx') {
    setDownloading(format)
    try {
      const fetchUrl = downloadUrl ? downloadUrl(format) : `/api/sessions/${sessionId}/download?format=${format}`
      const res = await fetch(fetchUrl)
      if (!res.ok) throw new Error('Download failed')

      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${speakerName.replace(/\s+/g, '_')}_Questions.${format === 'pdf' ? 'pdf' : 'docx'}`
      a.click()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error(err)
      alert('Failed to download file.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="flex gap-3 flex-wrap">
      {/* PDF button — primary orange */}
      <button
        onClick={() => handleDownload('pdf')}
        disabled={downloading !== null}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#f36f21] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:bg-[#d85e18] hover:shadow-[0_4px_16px_rgba(243,111,33,0.25)] font-[family-name:var(--font-dm-sans)]"
      >
        {downloading === 'pdf' ? <SpinnerIcon /> : <DownloadIcon />}
        {downloading === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
      </button>

      {/* DOCX button — purple outline */}
      <button
        onClick={() => handleDownload('docx')}
        disabled={downloading !== null}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[#542785] text-[#a87dd6] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:bg-[rgba(84,39,133,0.15)] font-[family-name:var(--font-dm-sans)]"
        style={{ background: 'var(--surface)' }}
      >
        {downloading === 'docx' ? <SpinnerIcon /> : <DownloadIcon />}
        {downloading === 'docx' ? 'Generating Word...' : 'Download Word'}
      </button>
    </div>
  )
}
