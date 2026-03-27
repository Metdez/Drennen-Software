import { SemesterProvider } from '@/components/SemesterContext'
import { NavHeader } from '@/components/NavHeader'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{background: 'var(--bg)'}}>
      <SemesterProvider>
        <NavHeader />
        <main className="max-w-4xl mx-auto px-6 py-10">
          {children}
        </main>
      </SemesterProvider>
    </div>
  )
}
