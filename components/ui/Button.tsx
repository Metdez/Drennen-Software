/**
 * @file Button.tsx
 * Accessible, forwardRef-compatible button primitive with variant and loading support.
 *
 * Used throughout the app as a design-system button baseline.
 * Variants: primary (orange), secondary (purple), outline (purple border), ghost (muted).
 * Sizes: sm, md, lg.
 * When `loading=true`: renders an inline spinner, disables the button, prevents pointer events.
 *
 * Forwards ref to the underlying `<button>` for form submission and focus management.
 */

import { type ButtonHTMLAttributes, forwardRef } from 'react'

/**
 * Defines the props interface for the `Button` component.
 *
 * It extends standard HTML button attributes, allowing the component to accept all properties an HTML button element would. Additionally, it introduces custom props for controlling the button's visual style, size, and loading state.
 *
 * Extends `ButtonHTMLAttributes<HTMLButtonElement>` to ensure full compatibility with native button attributes like `onClick`, `type`, `disabled`, etc. Custom props include `variant` for predefined styles, `size` for dimensions, and `loading` to display a spinner and disable the button.
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

/**
 * A JavaScript object that maps various button `variant` types to their corresponding Tailwind CSS class strings.
 *
 * It is used to encapsulate and centralize the styling logic for different visual appearances of the button. This approach makes it easy to apply consistent styles based on the chosen variant and simplifies maintenance by separating style definitions from the component's render logic.
 *
 * Each key (e.g., 'primary', 'secondary') corresponds to a variant, and its value is a string of concatenated Tailwind classes, including base styles, hover effects, and focus-visible ring styles. This ensures a consistent look and feel across different interactive states.
 */
const variantClasses = {
  primary:
    'bg-[#f36f21] text-white hover:bg-[#d85e18] focus-visible:ring-[#f36f21] ' +
    'hover:shadow-[0_0_0_3px_rgba(243,111,33,0.18),0_4px_16px_rgba(243,111,33,0.15)]',
  secondary:
    'bg-[#542785] text-white hover:bg-[#421f6a] focus-visible:ring-[#542785]',
  outline:
    'border border-[#542785] text-[#542785] bg-[var(--surface)] ' +
    'hover:bg-[var(--surface-elevated)] focus-visible:ring-[#542785]',
  ghost:
    'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] ' +
    'hover:text-[var(--text-primary)] focus-visible:ring-[var(--border-accent)]',
}

/**
 * A JavaScript object that maps various button `size` types to their corresponding Tailwind CSS class strings.
 *
 * It is used to encapsulate and centralize the styling logic for different dimensions and text sizes of the button. This ensures consistent sizing across the application and makes it easy to adjust the button's physical appearance.
 *
 * Each key (e.g., 'sm', 'md', 'lg') corresponds to a size, and its value is a string of Tailwind classes primarily defining padding and font size.
 */
const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

/**
 * A highly customizable and reusable React button component that supports various visual styles, sizes, and a loading state.
 *
 * It is used throughout the application to provide a consistent and accessible interactive element. By abstracting away styling and common behaviors like loading indicators and disabled states, it promotes design consistency and reduces boilerplate code.
 *
 * This component leverages `forwardRef` to allow parent components to obtain a ref to the underlying `HTMLButtonElement`. It dynamically applies Tailwind CSS classes based on `variant`, `size`, and any additional `className` props. The `disabled` state is automatically managed, being true if either `disabled` prop is true or `loading` is true. When `loading` is true, a `LoadingSpinner` component is rendered inside the button.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'font-[family-name:var(--font-dm-sans)]',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading && <LoadingSpinner />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

/**
 * A functional React component that renders an SVG-based animated loading spinner.
 *
 * It is used to visually indicate an ongoing process or a loading state, primarily within the `Button` component when the `loading` prop is set to true. This provides immediate visual feedback to the user that an action is in progress.
 *
 * The spinner is an SVG element with a `h-4 w-4 animate-spin` Tailwind class for rotation. It uses `currentColor` for its stroke and fill, allowing it to inherit the text color of its parent element, ensuring it visually blends with the button's design.
 */
function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
