# Directive: Personalize Leads

## Goal
Add a warm one-sentence personalization line + a Status column to every row of
`ZackBiz Owner Leads 4-4-26 - Sheet1.csv`, suitable for the Instantly
`{{personalization}}` template variable.

## Inputs
- `ZackBiz Owner Leads 4-4-26 - Sheet1.csv` (columns per CLAUDE.md schema)
- `.env` with `ANTHROPIC_API_KEY` set

## Tools
- `execution/personalize_leads.py` — full pipeline, resume-safe
- `execution/test_personalize_one.py` — single-lead smoke test

## Outputs
Same CSV, now with two new columns:
- `Personalization` — the cold-email sentence
- `Status` — `pending` | `done` | `failed`

## Usage

Full run:
```bash
python execution/personalize_leads.py
```

Smoke test on a small CSV:
```bash
LEADS_CSV=.tmp/smoke_leads.csv python execution/personalize_leads.py
```

Single-lead test:
```bash
python execution/test_personalize_one.py 0   # lead index
```

## Behavior
- Creates `<csv>.bak` once on first run.
- Adds `Personalization` and `Status` columns if missing.
- Skips rows where `Status=done` (resume-safe).
- Writes atomically to `<csv>.tmp` then renames — crash-safe.
- Flushes every 25 completed leads or every 10 seconds.

## Performance Target
2336 leads in 5–10 minutes, ~$1 of Haiku 4.5 tokens.

## Edge Cases
- Personal emails (gmail/yahoo/etc.) → falls through to DuckDuckGo search → generic fallback.
- 429 / blocked responses from DuckDuckGo → treated as Tier 2 miss, drops to Tier 3.
- Anthropic API errors → row marked `failed`, retried on next run.

## If Something Breaks
1. Check `.tmp/personalize_run.log` for the per-row source and error messages.
2. Pure helpers are unit-tested: `python -m pytest tests/`.
3. The `.bak` file is the original CSV — restore with `cp ZackBiz*.bak ZackBiz*.csv`.
