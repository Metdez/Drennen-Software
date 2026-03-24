# AGENT-DESIGN.md — Agent 04: Design System
# Wave 1 agent. Fires simultaneously with Agents 01, 02, and 03.
# You are building the visual foundation. Every UI component builds on your output.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md

---

## YOUR JOB

Build the global CSS and all primitive UI components. You own these files and ONLY these files:

```
app/globals.css
components/ui/Button.tsx
components/ui/Card.tsx
components/ui/Badge.tsx
components/ui/Spinner.tsx
```

You do NOT build any pages. You do NOT build any feature components (DropZone, NavHeader, etc.). Those are Agent 11's job.

---

## BRAND

```
Primary Orange:  #f36f21  → buttons, CTAs, active states, download actions
Secondary Purple: #542785  → headings, section titles, secondary actions
Accent Green:    #0f6b37  → success states, file accepted badge, completion
```

---

## FILE 1: app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --brand-orange: #f36f21;
    --brand-purple: #542785;
    --brand-green: #0f6b37;
  }

  * {
    box-sizing: border-box;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply text-zinc-900 bg-zinc-50;
  }

  h1 {
    @apply text-2xl font-semibold tracking-tight;
  }

  h2 {
    @apply text-xl font-semibold tracking-tight;
  }

  h3 {
    @apply text-lg font-medium;
  }
}

@layer utilities {
  .text-brand-orange { color: #f36f21; }
  .text-brand-purple { color: #542785; }
  .text-brand-green  { color: #0f6b37; }
  .bg-brand-orange   { background-color: #f36f21; }
  .bg-brand-purple   { background-color: #542785; }
  .bg-brand-green    { background-color: #0f6b37; }
  .border-brand-orange { border-color: #f36f21; }
  .border-brand-purple { border-color: #542785; }
  .ring-brand-orange   { --tw-ring-color: #f36f21; }
}
```

---

## FILE 2: components/ui/Button.tsx

A single Button component with all variants the app needs. No `"use client"` needed — it's a pure presentational component.

```tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantClasses = {
  primary:   'bg-[#f36f21] text-white hover:bg-[#d85e18] focus-visible:ring-[#f36f21]',
  secondary: 'bg-[#542785] text-white hover:bg-[#421f6a] focus-visible:ring-[#542785]',
  outline:   'border border-[#542785] text-[#542785] hover:bg-purple-50 focus-visible:ring-[#542785]',
  ghost:     'text-zinc-600 hover:bg-zinc-100 focus-visible:ring-zinc-400',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Import Spinner inline to avoid circular dependency
function Spinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <svg className={`${s} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
```

---

## FILE 3: components/ui/Card.tsx

Clean container component used throughout the app.

```tsx
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl border border-zinc-200',
        paddingClasses[padding],
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
```

---

## FILE 4: components/ui/Badge.tsx

Status badges. Used for file count, session state, tier labels in the output.

```tsx
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'purple' | 'orange'
  className?: string
}

const variantClasses = {
  default: 'bg-zinc-100 text-zinc-600',
  success: 'bg-green-50 text-[#0f6b37]',
  warning: 'bg-orange-50 text-[#d85e18]',
  purple:  'bg-purple-50 text-[#542785]',
  orange:  'bg-orange-50 text-[#f36f21]',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  )
}
```

---

## FILE 5: components/ui/Spinner.tsx

Standalone spinner for page-level loading states.

```tsx
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-[#f36f21] ${sizeClasses[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
```

---

## COMPLETION CHECKLIST

- [ ] `app/globals.css` — Tailwind directives + brand CSS variables + utility classes
- [ ] `components/ui/Button.tsx` — primary, secondary, outline, ghost variants with loading state
- [ ] `components/ui/Card.tsx` — clean container with padding options
- [ ] `components/ui/Badge.tsx` — status badges in brand colors
- [ ] `components/ui/Spinner.tsx` — animated spinner in brand orange
- [ ] No `"use client"` in any ui/ file (they are all server-renderable)
- [ ] All brand colors use hex literals matching AGENTS.md exactly
- [ ] `npx tsc --noEmit` passes clean
