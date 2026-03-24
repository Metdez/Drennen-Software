interface Question {
  label: string
  text: string
  attribution: string
}

interface Section {
  title: string
  primary: Question | null
  backup: Question | null
}

function parseOutput(output: string): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const raw of output.split('\n')) {
    const line = raw.trim()
    if (!line || line === '**Top Student Questions**') continue

    const titleMatch = line.match(/^\*{3}(\d+\.\s+.+?)\*{3}$/)
    if (titleMatch) {
      if (current) sections.push(current)
      current = { title: titleMatch[1], primary: null, backup: null }
      continue
    }

    const qMatch = line.match(/^\*\*(Primary|Backup):\*\*\s+(.*?)\s*\*\(([^)]+)\)\*\s*$/)
    if (qMatch && current) {
      const q: Question = { label: qMatch[1], text: qMatch[2], attribution: qMatch[3] }
      if (q.label === 'Primary') current.primary = q
      else current.backup = q
    }
  }

  if (current) sections.push(current)
  return sections
}

function QuestionRow({ q }: { q: Question }) {
  return (
    <p className="leading-relaxed mb-2 text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-secondary)]">
      <span className="font-semibold text-[var(--text-primary)]">{q.label}:</span>{' '}
      {q.text}{' '}
      <span className="text-[var(--text-muted)] italic">({q.attribution})</span>
    </p>
  )
}

export function OutputPreview({ output }: { output: string }) {
  const sections = parseOutput(output)

  return (
    <div className="rounded-2xl border border-[var(--border-accent)] overflow-hidden" style={{ background: 'var(--surface)' }}>
      <div className="px-6 py-4 border-b border-[var(--border-accent)]" style={{ background: 'var(--surface-elevated)' }}>
        <p className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
          Top Student Questions
        </p>
      </div>
      <div className="flex flex-col gap-0">
        {sections.map((section, i) => (
          <div
            key={i}
            className="p-6 border-b border-[var(--border-accent)] last:border-b-0 hover:bg-[var(--surface-elevated)] transition-colors duration-150"
          >
            <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] uppercase tracking-widest mb-1">
              Section {i + 1}
            </p>
            <p className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-[var(--text-primary)] mb-3 border-l-2 border-[#f36f21] pl-3">
              {section.title}
            </p>
            {section.primary && <QuestionRow q={section.primary} />}
            {section.backup && <QuestionRow q={section.backup} />}
          </div>
        ))}
      </div>
    </div>
  )
}
