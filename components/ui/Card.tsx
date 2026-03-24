interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  elevated?: boolean
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', padding = 'md', elevated = false }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-[var(--border-accent)]',
        elevated ? 'bg-[var(--surface-elevated)]' : 'bg-[var(--surface)]',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
