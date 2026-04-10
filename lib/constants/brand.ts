/**
 * Brand identity constants — colors and application name.
 *
 * Use `BRAND.ORANGE`, `BRAND.PURPLE`, and `BRAND.GREEN` everywhere instead of
 * hardcoding hex values. This ensures visual consistency across the UI, PDF/DOCX
 * exports, and any future rebranding only requires changes in this one file.
 *
 * Anti-pattern: `color: '#f36f21'`  ← never do this
 * Correct:       `color: BRAND.ORANGE`
 *
 * Do NOT import from this file directly. Import from the `@/lib/constants` barrel instead.
 */

/**
 * Brand color palette.
 *
 * - `ORANGE` — primary accent color; used for CTAs, highlights, and key UI elements
 * - `PURPLE` — secondary brand color; used for headings, badges, and accents
 * - `GREEN`  — tertiary brand color; used for success states and positive indicators
 */
/**
 * Defines a collection of core brand colors used throughout the application.
 *
 * Why it is used:
 * To provide a centralized, consistent source of brand-specific color codes. This prevents hardcoding colors directly in UI components and ensures easy modification if brand guidelines change in the future, promoting maintainability.
 *
 * Important implementation details:
 * - It uses `as const` to make the object deeply read-only and infer literal types for its properties, enhancing type safety and preventing accidental modification at runtime.
 * - Each property represents a key brand color, identified by a descriptive name (e.g., ORANGE, PURPLE, GREEN).
 * - The values are standard hexadecimal color codes.
 */
export const BRAND = {
  ORANGE: '#f36f21',
  PURPLE: '#542785',
  GREEN: '#0f6b37',
} as const

/** The display name of the application shown in headers and document titles. */
/**
 * Stores the official display name of the application.
 *
 * Why it is used:
 * To provide a consistent name across various user interface elements such as headers, navigation bars, document titles (e.g., <title> tag in HTML), and any textual references to the application. This ensures brand consistency and simplifies updates if the application's name needs to change.
 *
 * Important implementation details:
 * - It uses `as const` to ensure the string is treated as a literal type and is read-only, preventing accidental changes to the application's name during runtime.
 * - The value "Drennen MGMT 305" specifically identifies the application, likely indicating its context as a management tool or courseware for a specific subject.
 */
export const APP_NAME = 'Drennen MGMT 305' as const
