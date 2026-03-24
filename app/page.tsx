import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/db/users'

export const dynamic = 'force-dynamic'

export default async function RootPage() {
  const user = await getCurrentUser()
  redirect(user ? '/dashboard' : '/login')
}
