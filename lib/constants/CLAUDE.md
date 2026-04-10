# lib/constants/ — Shared Constants

This directory is the single source of truth for app-wide constants.

## Files

- `routes.ts` — canonical route strings used for navigation and redirects.
- `brand.ts` — brand colors and app name.
- `ai.ts` — AI defaults and model-related config.
- `validation.ts` — accepted file types and upload validation constants.

## Conventions

- Import from the barrel: `import { ROUTES, BRAND } from '@/lib/constants'`.
- Do not deep-import individual constant files from feature code.
- When a new route or shared config is added, update the barrel and the root `CLAUDE.md`.

