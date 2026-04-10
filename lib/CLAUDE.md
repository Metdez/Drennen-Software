# lib/ — Shared Application Logic

This directory holds the reusable building blocks below the route layer.

## Directory Map

- `ai/` — AI clients, prompts, and generation agents.
- `db/` — all Supabase query functions.
- `export/` — PDF/DOCX and text export builders.
- `parse/` — ZIP and document parsing pipeline.
- `supabase/` — client creation and temp-storage helpers.
- `stripe/` — Stripe SDK singleton.
- `constants/` — shared route, brand, AI, and validation constants.
- `utils/` — formatting, transforms, and error normalization.

## Conventions

- Prefer small domain-specific modules over catch-all helpers.
- Keep cross-layer dependencies flowing inward: routes call `lib/`, not the other way around.
- When a helper becomes widely used, document it here and in the nested directory doc.

