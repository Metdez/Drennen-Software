import { getCurrentUser } from '@/lib/db/users'
import { getStudentsWithParticipation } from '@/lib/db/student_submissions'
import { RosterTable } from '@/components/RosterTable'
import { ClearDataButton } from '@/components/ClearDataButton'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RosterPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const students = await getStudentsWithParticipation()

  return (
    <div>
      <div className="mb-8 animate-fade-up">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
              Student Roster
            </h1>
            <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
            <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
              All students who have submitted across your sessions. Click a student to see their submissions.
            </p>
            {students.length === 0 && (
              <p className="mt-2 text-[var(--text-muted)] text-xs font-[family-name:var(--font-dm-sans)]">
                Student data is recorded for sessions uploaded going forward. Earlier sessions don&apos;t have individual submission records.
              </p>
            )}
          </div>
          <div className="pt-1 shrink-0">
            <ClearDataButton />
          </div>
        </div>
      </div>
      <div className="animate-fade-up-delay-1">
        <RosterTable students={students} />
      </div>
    </div>
  )
}
