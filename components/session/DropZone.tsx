"use client"

import { useState } from 'react'

export function DropZone({ onFileChangeAction }: { onFileChangeAction: (file: File | null) => void }) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.zip')) {
      setError('Please upload a ZIP file')
      setFile(null)
      onFileChangeAction(null)
      return
    }
    setError(null)
    setFile(selectedFile)
    onFileChangeAction(selectedFile)
  }

  const isHovered = isDragActive

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)]">
        Canvas ZIP Download
      </label>
      <div
        className={`relative flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
          isHovered
            ? 'border-[#f36f21] bg-[rgba(243,111,33,0.04)]'
            : 'border-[var(--border-accent)] bg-[var(--surface)] hover:border-[#f36f21] hover:bg-[rgba(243,111,33,0.04)]'
        }`}
        style={isDragActive ? {boxShadow: '0 0 0 4px rgba(243,111,33,0.12), 0 0 20px rgba(243,111,33,0.06)'} : undefined}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".zip"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
        />
        {file ? (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background: 'rgba(15,107,55,0.15)', border: '1px solid rgba(15,107,55,0.3)'}}>
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
                Drop your Canvas ZIP here
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-[family-name:var(--font-dm-sans)]">
                or click to browse — .zip files only
              </p>
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400 font-medium font-[family-name:var(--font-dm-sans)]">{error}</p>}
    </div>
  )
}
