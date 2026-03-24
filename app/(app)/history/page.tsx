import { getCurrentUser } from '@/lib/db/users'
import { getSessionsByUser } from '@/lib/db/sessions'
import { SessionsTable } from '@/components/SessionsTable'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const sessions = await getSessionsByUser(user.id)

  return (
    <div>
      <div className="mb-8 animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          Session History
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
          All your past question sheets. Click any row to reopen.
        </p>
      </div>
      <div className="animate-fade-up-delay-1">
        <SessionsTable sessions={sessions} />
      </div>
    </div>
  )
}
