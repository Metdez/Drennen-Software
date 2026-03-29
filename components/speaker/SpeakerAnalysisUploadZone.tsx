'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { uploadTempZip } from '@/lib/supabase/storage'
import { ROUTES } from '@/lib/constants'

interface Props {
  sessionId: string
  onUploadComplete: () => void
}

export function SpeakerAnalysisUploadZone({ sessionId, onUploadComplete }: Props) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true)
    } else if (e.type === 'dragleave') {
      setIsDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.zip')) {
      setError('Please upload a ZIP file')
      setFile(null)
      return
    }
    setError(null)
    setFile(selectedFile)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress('Uploading...')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired — please sign in again.')
        return
      }

      const storagePath = await uploadTempZip(user.id, file)
      setProgress('Processing student files...')

      const res = await fetch(ROUTES.API_SESSION_SPEAKER_ANALYSES(sessionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Upload failed')
        return
      }

      const data = await res.json() as { fileCount: number; studentNames: string[] }
      setProgress(`Done — ${data.fileCount} analyses from ${data.studentNames.length} students`)

      // Small delay so the user sees the success message
      setTimeout(() => {
        onUploadComplete()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 animate-fade-up">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(15,107,55,0.1)', border: '1px solid rgba(15,107,55,0.2)' }}>
          <svg className="w-7 h-7 text-[#0f6b37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)] mb-1">
          Upload Speaker Analyses
        </h3>
        <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          Upload the Canvas ZIP of student speaker evaluation analyses. The AI will analyze evaluation themes, leadership qualities identified, course concept connections, and analytical sophistication.
        </p>
      </div>

      <div
        className={`relative flex flex-col items-center justify-center w-full max-w-md h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-[#0f6b37] bg-[rgba(15,107,55,0.04)]'
            : file
              ? 'border-[#0f6b37] bg-[rgba(15,107,55,0.04)]'
              : 'border-[var(--border-accent)] bg-[var(--surface)] hover:border-[#0f6b37] hover:bg-[rgba(15,107,55,0.04)]'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleChange}
          disabled={uploading}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(15,107,55,0.15)', border: '1px solid rgba(15,107,55,0.3)' }}>
              <svg className="w-5 h-5 text-[#4ead7c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">{file.name}</p>
            <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pointer-events-none">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
                Drop your speaker analysis ZIP here
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-[family-name:var(--font-dm-sans)]">
                or click to browse — .zip files only
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 font-medium font-[family-name:var(--font-dm-sans)]">{error}</p>
      )}

      {progress && (
        <p className="text-xs text-[#0f6b37] font-medium font-[family-name:var(--font-dm-sans)]">{progress}</p>
      )}

      {file && !uploading && !progress && (
        <button
          onClick={handleUpload}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white font-[family-name:var(--font-dm-sans)] transition-colors duration-200"
          style={{ background: '#0f6b37' }}
        >
          Upload &amp; Analyze
        </button>
      )}

      {uploading && (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-[#0f6b37] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">Processing...</span>
        </div>
      )}
    </div>
  )
}
