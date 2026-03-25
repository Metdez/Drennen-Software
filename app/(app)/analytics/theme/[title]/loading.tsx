export default function ThemeLoading() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-up">
      <div className="mb-8">
        <div className="h-6 w-24 bg-[var(--surface-elevated)] animate-pulse rounded mb-4" />
        <div className="h-10 w-96 bg-[var(--surface-elevated)] animate-pulse rounded mb-3" />
        <div className="h-4 w-64 bg-[var(--surface-elevated)] animate-pulse rounded" />
      </div>

      <div className="space-y-6">
        <div className="h-[400px] w-full bg-[var(--surface-elevated)] animate-pulse rounded-xl" />
        <div className="h-[600px] w-full bg-[var(--surface-elevated)] animate-pulse rounded-xl" />
      </div>
    </div>
  )
}
