# components/ui/ — Shared Primitives

## Purpose

Low-level, broadly reusable UI building blocks. These components have no business logic and no API calls — they are pure presentation primitives.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `Badge.tsx` | Color-coded pill label (default/success/warning/purple/orange variants) | Roster table, SessionsTable debrief status, StudentSessionCard | None |
| `Button.tsx` | `forwardRef` button with primary/secondary/outline/ghost variants and a `loading` spinner state | Any component needing a standardized button | None |
| `Card.tsx` | Rounded container with configurable padding (sm/md/lg) and elevated background variant | Student detail tabs, ProfessorNotesEditor, GrowthIntelligencePanel | None |
| `Spinner.tsx` | Animated SVG spinner in three sizes (sm/md/lg); defaults to `BRAND.ORANGE` color | Loading states throughout the app | None |

## Key Patterns

- Keep these components logic-free. Feature-specific behavior goes in the feature directory.
- `Button` uses `forwardRef` for composability (e.g., wrapping in tooltips or form submit handlers).
- `Badge` variant colors use RGBA Tailwind values that respect the dark-mode CSS variables — do not add new hardcoded hex values.
- `Spinner` exposes a `className` escape hatch for positioning overrides; avoid wrapping it in extra container divs.

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values. `Spinner` uses `text-[#f36f21]` (BRAND.ORANGE) by default.
