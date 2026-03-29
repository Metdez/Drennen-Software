# components/ — React Components

## Directory Structure

Components are organized by feature domain:

| Directory | Purpose |
|-----------|---------|
| `session/` | Session display, upload, download, sharing |
| `analytics/` | Analysis panels, theme visualization, synthesis, CollapsiblePanel, WhatChangedBanner, ThemeExplorer |
| `student/` | Roster, profiles, growth, notes, reflections |
| `speaker/` | Speaker briefs, portals, analysis uploads |
| `debrief/` | Post-session debrief capture |
| `semester/` | Semester context, selection, management |
| `subscription/` | Paywall, billing banners, subscription context |
| `layout/` | Navigation, auth forms, config panels |
| `report/` | Semester report sections (ExecutiveSummary, ThemeEvolution, etc.) |
| `compare/` | Session comparison components |
| `portfolio/` | Public portfolio components |
| `ui/` | Shared primitives (Badge, Button, Card, Spinner) |

## Conventions

- All interactive components use `'use client'` directive
- Brand colors: import from `@/lib/constants` — use `BRAND.ORANGE`, `BRAND.PURPLE`, `BRAND.GREEN`. Never hardcode hex values.
- Tailwind CSS for all styling; CSS variables defined in `app/globals.css`
- Component names: PascalCase matching the filename

## Adding a New Component

1. Determine which feature directory it belongs to
2. Create `components/feature/YourComponent.tsx`
3. Add `'use client'` if it uses hooks, event handlers, or browser APIs
4. Import brand colors from `@/lib/constants` if needed
