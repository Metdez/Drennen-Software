# lib/utils/ — Formatting, Transforms, and Errors

This directory contains small shared helpers that should not live inside components or route handlers.

## Files

- `transforms.ts` — converts snake_case database rows into camelCase domain objects.
- `format.ts` — display helpers for student names, dates, counts, and slugs.
- `errors.ts` — normalizes AI/Gemini error payloads into safe human-readable messages.

## Conventions

- Put data-shaping logic here when it is reused across multiple layers.
- Keep formatting logic presentation-agnostic so both routes and components can reuse it.
- Normalize thrown errors before they reach the UI or API response boundary.

