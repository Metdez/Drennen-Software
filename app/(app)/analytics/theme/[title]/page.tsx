import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/db/users'
import { runCrossSessionThemeAnalysis } from '@/lib/ai/analysisAgent'

export const dynamic = 'force-dynamic'

export default async function ThemeDrilldownPage({ params }: { params: { title: string } }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const decodedTitle = decodeURIComponent(params.title)

  const supabase = createClient()

  // 1. Find sessions for this user that contain this theme
  const { data: themeSessions, error: tsErr } = await supabase
    .from('session_themes')
    .select('session_id, sessions!inner(user_id, speaker_name)')
    .eq('sessions.user_id', user.id)
    .eq('theme_title', decodedTitle)

  if (tsErr) throw new Error(tsErr.message)
  if (!themeSessions || themeSessions.length === 0) {
    return notFound()
  }

  const sessionIds = themeSessions.map(t => t.session_id)

  const sessionMap = new Map<string, string>()
  themeSessions.forEach(t => {
    sessionMap.set(t.session_id, (t.sessions as any).speaker_name)
  })

  // 2. Fetch all student submissions for these sessions
  const { data: submissions, error: subErr } = await supabase
    .from('student_submissions')
    .select('session_id, student_name, submission_text')
    .in('session_id', sessionIds)

  if (subErr) throw new Error(subErr.message)

  // 3. Prepare data for AI
  const aiInput = (submissions ?? []).map(s => ({
    text: s.submission_text,
    student_name: s.student_name,
    session_id: s.session_id,
    speaker_name: sessionMap.get(s.session_id) ?? 'Unknown Speaker'
  }))

  // 4. Run AI analysis
  let analysis = null
  let error = null
  try {
    analysis = await runCrossSessionThemeAnalysis(decodedTitle, aiInput)
  } catch (e) {
    console.error('AI Analysis failed:', e)
    error = e instanceof Error ? e.message : 'Unknown error generating analysis'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 animate-fade-up">
        <Link 
          href="/analytics" 
          className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          ← Back to Analytics
        </Link>
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          {decodedTitle}
        </h1>
        <div className="h-0.5 w-12 bg-[var(--brand-orange)] mb-3" />
        <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
          Deep dive into student engagement across {sessionIds.length} session{sessionIds.length !== 1 ? 's' : ''}.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 mb-8 text-red-500">
          Failed to generate AI analysis: {error}
        </div>
      )}

      {analysis && (
        <>
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-8 mb-8 animate-fade-up-delay-1 shadow-sm relative overflow-hidden">
            {/* Subtle background glow effect using brand colors */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-purple)]/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute top-0 left-0 w-64 h-64 bg-[var(--brand-orange)]/5 blur-[80px] rounded-full -translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[var(--brand-orange)]">✦</span>
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
                AI Synthesis
              </h2>
            </div>
            
            <div className="prose prose-sm md:prose-base prose-invert max-w-none text-[var(--text-secondary)] mb-8">
              {analysis.narrative.split('\n').map((paragraph, i) => (
                <p key={i} className="mb-4 last:mb-0 leading-relaxed font-[family-name:var(--font-dm-sans)]">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-[var(--border)]">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--border)] pb-2 inline-block">
                  Emerging Patterns
                </h3>
                <ul className="space-y-4">
                  {analysis.patterns.map((p, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                      <span className="shrink-0 pt-0.5 text-lg">{p.emoji}</span>
                      <span className="leading-relaxed">{p.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 border-b border-[var(--border)] pb-2 inline-block">
                  Missed Angles
                </h3>
                <ul className="space-y-4">
                  {analysis.missed_angles.map((m, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                      <span className="shrink-0 pt-1.5 flex items-center justify-center">
                         <span className="w-1.5 h-1.5 bg-[var(--brand-orange)] rounded-full"></span>
                      </span>
                      <span className="leading-relaxed">{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 mb-8 animate-fade-up-delay-2 shadow-sm">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--border)]">
              <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
                Relevant Questions
              </h2>
              <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--surface-elevated)] text-[var(--text-muted)] border border-[var(--border)]">
                {analysis.relevant_questions.length} Questions
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {analysis.relevant_questions.map((q, i) => (
                <div key={i} className="p-5 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[rgba(255,107,0,0.5)] transition-all hover:shadow-sm hover:shadow-[rgba(255,107,0,0.05)]">
                  <p className="text-[15px] text-[var(--text-primary)] mb-4 leading-relaxed font-medium">
                    &ldquo;{q.text}&rdquo;
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] uppercase tracking-wider">
                    <span className="font-bold text-[var(--brand-orange)] opacity-90">{q.student_name}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--border-accent)]"></span>
                    <span className="font-semibold text-[var(--text-secondary)]">{q.speaker_name}</span>
                  </div>
                </div>
              ))}
              
              {analysis.relevant_questions.length === 0 && (
                <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-xl">
                  <p className="text-[var(--text-muted)] text-sm">No highly relevant questions found in this set.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
