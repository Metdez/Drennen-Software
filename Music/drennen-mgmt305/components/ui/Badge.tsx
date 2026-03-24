interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'purple' | 'orange'
  className?: string
}

const variantClasses = {
  default: 'bg-[var(--surface-elevated)] border border-[var(--border-accent)] text-[var(--text-secondary)]',
  success: 'bg-[rgba(15,107,55,0.2)] border border-[rgba(15,107,55,0.35)] text-[#4ead7c]',
  warning: 'bg-[rgba(243,111,33,0.12)] border border-[rgba(243,111,33,0.25)] text-[#f36f21]',
  purple:  'bg-[rgba(84,39,133,0.2)] border border-[rgba(84,39,133,0.35)] text-[#a87dd6]',
  orange:  'bg-[rgba(243,111,33,0.12)] border border-[rgba(243,111,33,0.25)] text-[#f36f21]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        'font-[family-name:var(--font-dm-sans)]',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
