import { getCurrentUser } from '@/lib/db/users'
import { getStudentDetail } from '@/lib/db/student_submissions'
import { StudentSessionCard } from '@/components/StudentSessionCard'
import { Badge } from '@/components/ui/Badge'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function participationVariant(count: number, total: number): 'success' | 'orange' | 'default' {
  if (total === 0) return 'default'
  const rate = count / total
  if (rate >= 0.8) return 'success'
  if (rate >= 0.5) return 'orange'
  return 'default'
}

export default async function StudentDetailPage({
  params,
}: {
  params: { studentName: string }
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  let decodedName: string
  try {
    decodedName = decodeURIComponent(params.studentName)
  } catch {
    notFound()
  }

  const detail = await getStudentDetail(decodedName)
  if (!detail) notFound()

  const participationPct = detail.totalSessions > 0
    ? Math.round((detail.sessionCount / detail.totalSessions) * 100)
    : 0

  return (
    <div>
      <div className="mb-2 animate-fade-up">
        <Link
          href="/roster"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-200 font-[family-name:var(--font-dm-sans)]"
        >
          ← Roster
        </Link>
      </div>

      <div className="mb-8 animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          {detail.studentName}
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <div className="flex items-center gap-3">
          <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
            Submitted in {detail.sessionCount} of {detail.totalSessions} session{detail.totalSessions !== 1 ? 's' : ''}
          </p>
          <Badge variant={participationVariant(detail.sessionCount, detail.totalSessions)}>
            {participationPct}%
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-4 animate-fade-up-delay-1">
        {detail.sessions.map((session) => (
          <StudentSessionCard key={session.sessionId} session={session} />
        ))}
      </div>
    </div>
  )
}
