/**
 * @file Badge.tsx
 * Small pill-shaped label component used for status indicators and metadata tags.
 *
 * Used by: components/session/SessionsTable.tsx, components/session/StudentSessionCard.tsx,
 *           and throughout the roster/analytics pages.
 *
 * Variants: default (neutral), success (green), warning/orange (orange), purple.
 * All variants use CSS variables + hard-coded rgba values for semi-transparent backgrounds.
 */

/**
 * Defines the shape of the props object accepted by the Badge component.
 * 1. What it does: Specifies the available properties for configuring a `Badge` component.
 * 2. Why it is used: Ensures type safety and provides a clear contract for how the `Badge` component should be used, making it easier to develop and maintain.
 * 3. Important implementation details:
 *    - `children`: Represents the content to be displayed inside the badge, typically text or another React node.
 *    - `variant`: An optional property that dictates the visual style (color scheme) of the badge, choosing from a predefined set of styles.
 *    - `className`: An optional string that allows passing additional CSS classes to customize the badge's appearance beyond its base and variant styles.
 */
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'purple' | 'orange'
  className?: string
}

/**
 * A JavaScript object mapping predefined variant names to specific Tailwind CSS classes.
 * 1. What it does: Stores a collection of CSS class strings, each corresponding to a different visual variant of the `Badge` component.
 * 2. Why it is used: Centralizes the styling logic for different badge types, promoting consistency and reusability. This avoids inline style definitions and makes it easier to manage and update the visual themes of badges.
 * 3. Important implementation details:
 *    - Each key (e.g., 'default', 'success') corresponds to a variant name.
 *    - Each value is a string containing Tailwind CSS classes that define the background, border, and text color for that variant.
 *    - Utilizes CSS variables (e.g., `--surface-elevated`, `--border-accent`, `--text-secondary`, `--font-dm-sans`) for theme-ability and dynamic color adjustments.
 *    - Some variants (e.g., 'warning' and 'orange') currently share the same styling, indicating potential design intent or an area for future differentiation.
 */
const variantClasses = {
  default: 'bg-[var(--surface-elevated)] border border-[var(--border-accent)] text-[var(--text-secondary)]',
  success: 'bg-[rgba(15,107,55,0.2)] border border-[rgba(15,107,55,0.35)] text-[#4ead7c]',
  warning: 'bg-[rgba(243,111,33,0.12)] border border-[rgba(243,111,33,0.25)] text-[#f36f21]',
  purple:  'bg-[rgba(84,39,133,0.2)] border border-[rgba(84,39,133,0.35)] text-[#a87dd6]',
  orange:  'bg-[rgba(243,111,33,0.12)] border border-[rgba(243,111,33,0.25)] text-[#f36f21]',
}

/**
 * A functional React component that renders a small, customizable UI element typically used to display labels, status indicators, or short pieces of information.
 * 1. What it does: Renders a `<span>` element styled as a badge, incorporating base styles, variant-specific styles, and any custom styles provided via props.
 * 2. Why it is used: Provides a consistent, reusable, and themable component for displaying badges across the application, adhering to the established design system.
 * 3. Important implementation details:
 *    - It's a functional component that deconstructs `children`, `variant`, and `className` from `BadgeProps`.
 *    - `variant` defaults to 'default' if not explicitly provided, ensuring a fallback style.
 *    - `className` defaults to an empty string, preventing issues when no custom classes are passed.
 *    - Styles are applied using an array of class strings joined together, ensuring proper concatenation of base styles, variant styles (from `variantClasses`), and custom `className`.
 *    - Base styles include `inline-flex`, `items-center`, `px-2.5`, `py-0.5`, `rounded-full`, `text-xs`, and `font-medium`.
 *    - It applies a custom font using a CSS variable: `font-[family-name:var(--font-dm-sans)]`.
 */
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
