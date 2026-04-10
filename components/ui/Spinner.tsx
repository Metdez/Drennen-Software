/**
 * @file Spinner.tsx
 * Brand-colored (BRAND.ORANGE / #f36f21) animated SVG loading indicator.
 *
 * Used across the app for loading states in panels, buttons, and page-level skeletons.
 * Sizes: sm (16px), md (24px), lg (40px). Includes `aria-label="Loading"` for accessibility.
 * Prefer this over inline spinner SVGs to keep the loading animation consistent.
 */

/**
 * Defines the shape of the properties that can be passed to the Spinner component.
 * It is used to type-check the props, ensuring that the component receives valid inputs for size and additional styling classes.
 * Includes an optional `size` property that restricts values to 'sm', 'md', or 'lg', and an optional `className` for custom Tailwind CSS or other styles.
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * A constant object that maps predefined spinner size keys to specific Tailwind CSS utility classes for height and width.
 * It is used to centralize and standardize the dimensions of the spinner based on the selected size ('sm', 'md', 'lg'), promoting consistency and ease of maintenance across the application.
 * Each key-value pair specifies `h-{value} w-{value}` classes, e.g., 'sm' maps to 'h-4 w-4'.
 */
const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
}

/**
 * Renders an animated SVG spinner component that indicates a loading state.
 * It is used to provide visual feedback to users during asynchronous operations or data fetching, improving the user experience by showing that an action is in progress.
 *
 * Important implementation details:
 * - It accepts `SpinnerProps` which allows customizing its `size` (default 'md') and applying additional `className` (default empty string).
 * - The SVG element uses `animate-spin` for continuous rotation and `text-[#f36f21]` for a consistent brand color.
 * - The `sizeClasses` object dynamically applies height and width based on the `size` prop.
 * - It uses `circle` and `path` SVG elements to construct the spinner's visual appearance, with `opacity-25` and `opacity-75` for the base and active parts respectively.
 * - Includes `aria-label="Loading"` for accessibility purposes.
 */
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
