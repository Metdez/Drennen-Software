/**
 * Root HTML layout (`app/layout.tsx`).
 *
 * Applies global fonts (Playfair Display for headings, DM Sans for body),
 * sets page metadata, and wraps all routes in the `<html>` / `<body>` shell.
 * This layout is the outermost wrapper — every route inherits it.
 */
import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'

/**
 * What it does: Loads the 'Playfair Display' Google Font using Next.js's optimized font system.
 * Why it is used: To provide a distinct, elegant serif typeface for headings and prominent text elements throughout the application, aligning with the design aesthetic.
 * Important implementation details: It utilizes `next/font/google` for automatic self-hosting and performance optimization. The font is loaded with the 'latin' subset, configured to use a CSS variable (`--font-playfair`) for easy application in CSS, and employs a 'swap' display strategy to prevent layout shifts.
 */
/**
 * What it does: Loads the 'Playfair Display' Google Font using Next.js's optimized font system.
 * Why it is used: To provide a distinct, elegant serif typeface for headings and prominent text elements throughout the application, aligning with the design aesthetic.
 * Important implementation details: It utilizes `next/font/google` for automatic self-hosting and performance optimization. The font is loaded with the 'latin' subset, configured to use a CSS variable (`--font-playfair`) for easy application in CSS, and employs a 'swap' display strategy to prevent layout shifts.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

/**
 * What it does: Loads the 'DM Sans' Google Font using Next.js's optimized font system.
 * Why it is used: To provide a clean, modern sans-serif typeface for body text and general UI elements, ensuring readability and consistency across the application.
 * Important implementation details: It utilizes `next/font/google` for automatic self-hosting and performance optimization. The font is loaded with the 'latin' subset, configured to use a CSS variable (`--font-dm-sans`) for easy application in CSS, and employs a 'swap' display strategy to prevent layout shifts.
 */
/**
 * What it does: Loads the 'DM Sans' Google Font using Next.js's optimized font system.
 * Why it is used: To provide a clean, modern sans-serif typeface for body text and general UI elements, ensuring readability and consistency across the application.
 * Important implementation details: It utilizes `next/font/google` for automatic self-hosting and performance optimization. The font is loaded with the 'latin' subset, configured to use a CSS variable (`--font-dm-sans`) for easy application in CSS, and employs a 'swap' display strategy to prevent layout shifts.
 */
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

/**
 * What it does: Defines the static metadata for the web application.
 * Why it is used: To provide essential information for search engine optimization (SEO), browser tabs, and social media previews. It sets the primary title and description that appears in search results and browser tabs.
 * Important implementation details: This is a Next.js specific `Metadata` object. It sets the application title to 'Drennen MGMT 305' and the description to 'Guest Speaker Question Sheet Generator', which are crucial for discoverability and user experience.
 */
/**
 * What it does: Defines the static metadata for the web application.
 * Why it is used: To provide essential information for search engine optimization (SEO), browser tabs, and social media previews. It sets the primary title and description that appears in search results and browser tabs.
 * Important implementation details: This is a Next.js specific `Metadata` object. It sets the application title to 'Drennen MGMT 305' and the description to 'Guest Speaker Question Sheet Generator', which are crucial for discoverability and user experience.
 */
export const metadata: Metadata = {
  title: 'Drennen MGMT 305',
  description: 'Guest Speaker Question Sheet Generator',
}

/**
 * What it does: The root layout component for the entire Next.js application, wrapping all pages and nested layouts.
 * Why it is used: To establish the fundamental HTML structure (`<html>`, `<body>`), apply global styling (such as fonts), and provide a consistent outer shell for all content rendered by the application.
 * Important implementation details: It's a server component by default in Next.js App Router. It accepts `children` (representing the current page or nested layout) as a React node. The CSS variables defined by the `playfair` and `dmSans` font loaders are applied to the `body` element, making these fonts accessible globally via CSS.
 */
/**
 * What it does: The root layout component for the entire Next.js application, wrapping all pages and nested layouts.
 * Why it is used: To establish the fundamental HTML structure (`<html>`, `<body>`), apply global styling (such as fonts), and provide a consistent outer shell for all content rendered by the application.
 * Important implementation details: It's a server component by default in Next.js App Router. It accepts `children` (representing the current page or nested layout) as a React node. The CSS variables defined by the `playfair` and `dmSans` font loaders are applied to the `body` element, making these fonts accessible globally via CSS.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${dmSans.variable}`}>{children}</body>
    </html>
  )
}
