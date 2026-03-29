import { SemesterProvider } from '@/components/semester/SemesterContext'
import { SubscriptionProvider } from '@/components/subscription/SubscriptionContext'
import { NavHeader } from '@/components/layout/NavHeader'
import { SubscriptionBanner } from '@/components/subscription/SubscriptionBanner'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{background: 'var(--bg)'}}>
      <SubscriptionProvider>
        <SemesterProvider>
          <NavHeader />
          <main className="max-w-4xl mx-auto px-6 py-10">
            <SubscriptionBanner />
            {children}
          </main>
        </SemesterProvider>
      </SubscriptionProvider>
    </div>
  )
}
