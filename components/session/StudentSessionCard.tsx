import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { SessionWithSubmission } from '@/types'

export function StudentSessionCard({ session }: { session: SessionWithSubmission }) {
  const date = new Date(session.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
          {session.speakerName}
        </span>
        <Badge variant="purple">{date}</Badge>
      </div>
      <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mb-3 truncate">
        {session.filename}
      </p>
      {/* Pre-session questions */}
      <div className="mb-1">
        <span className="text-[10px] uppercase tracking-wider font-medium text-[#f36f21] font-[family-name:var(--font-dm-sans)]">
          Questions
        </span>
      </div>
      <pre
        className="text-xs text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] whitespace-pre-wrap rounded p-3 max-h-48 overflow-y-auto"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-accent)' }}
      >
        {session.submissionText}
      </pre>

      {/* Post-session reflection */}
      {session.debriefText && (
        <>
          <div className="mt-4 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-medium text-[#542785] font-[family-name:var(--font-dm-sans)]">
              Post-Session Reflection
            </span>
          </div>
          <pre
            className="text-xs text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] whitespace-pre-wrap rounded p-3 max-h-48 overflow-y-auto"
            style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(84,39,133,0.2)', borderLeft: '3px solid #542785' }}
          >
            {session.debriefText}
          </pre>
        </>
      )}

      {/* Speaker analysis */}
      {session.speakerAnalysisText && (
        <>
          <div className="mt-4 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-medium text-[#0f6b37] font-[family-name:var(--font-dm-sans)]">
              Speaker Analysis
            </span>
          </div>
          <pre
            className="text-xs text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] whitespace-pre-wrap rounded p-3 max-h-48 overflow-y-auto"
            style={{ background: 'var(--surface-elevated)', border: '1px solid rgba(15,107,55,0.2)', borderLeft: '3px solid #0f6b37' }}
          >
            {session.speakerAnalysisText}
          </pre>
        </>
      )}
    </Card>
  )
}
