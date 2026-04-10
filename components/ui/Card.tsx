/**
 * @file Card.tsx
 * Surface container primitive providing rounded corners, border, and padding control.
 *
 * Used throughout the app as the standard content container.
 * `elevated=true` switches the background from `--surface` to `--surface-elevated`,
 * creating a visual lift for nested cards or highlighted content areas.
 */

/**
 * Defines the shape of the properties accepted by the `Card` component.
 *
 * It is used to enforce type safety and provide clear documentation for the component's API, ensuring that only valid props are passed and handled correctly.
 *
 * Important implementation details:
 * - `children`: Represents the content to be rendered inside the card, standard for React container components.
 * - `className`: An optional string allowing consumers to pass custom CSS classes, which will be merged with the component's default styles.
 * - `padding`: An optional union type ('sm' | 'md' | 'lg') that dictates the internal spacing around the children, providing predefined size options.
 * - `elevated`: An optional boolean that, when true, applies a distinct background style, typically used to visually differentiate the card from the default surface.
 */
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  elevated?: boolean
}

/**
 * A constant object that maps specific padding size identifiers to corresponding Tailwind CSS utility classes.
 *
 * It is used to centralize and manage the styling logic for different padding options within the `Card` component. This approach makes the component more modular, easier to maintain, and prevents hardcoding Tailwind classes directly into the JSX, promoting consistency and reusability.
 *
 * Important implementation details:
 * - Keys (`sm`, `md`, `lg`) directly correspond to the valid values for the `padding` prop in `CardProps`.
 * - Values (`p-4`, `p-6`, `p-8`) are standard Tailwind CSS classes that apply padding in pixels or rem units.
 */
const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

/**
 * A React functional component that renders a stylized container element, commonly known as a "card" in UI design.
 *
 * It is used to provide a consistent and reusable UI element for grouping related content, offering visual separation, controlled internal spacing, and an optional elevated appearance. This promotes a cohesive look and feel across the application and simplifies the development of complex layouts.
 *
 * Important implementation details:
 * - **Props**: Destructures `children`, `className`, `padding`, and `elevated` from `CardProps`.
 * - **Default Props**: Sets default values for `className` to an empty string, `padding` to `'md'`, and `elevated` to `false`, providing sensible defaults for common usage.
 * - **Styling**: Constructs the `className` string by joining an array of classes:
 *     - Applies base styles: `rounded-xl`, `border`, and `border-[var(--border-accent)]` for rounded corners and a themed border.
 *     - Conditionally applies background color: Uses `bg-[var(--surface-elevated)]` when `elevated` is true, otherwise `bg-[var(--surface)]`, leveraging CSS variables for theme integration.
 *     - Dynamically applies padding: Retrieves the appropriate Tailwind class from `paddingClasses` based on the `padding` prop.
 *     - Appends `className`: Allows consumers to add or override styles with custom classes.
 * - **Content Rendering**: Renders the `children` prop directly inside the `div`, making it a flexible content container.
 */
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
