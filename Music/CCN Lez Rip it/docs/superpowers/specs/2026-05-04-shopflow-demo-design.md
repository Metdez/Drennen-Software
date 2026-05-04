# ShopFlow Demo — Design Spec

**Date:** 2026-05-04
**Status:** Approved
**Owner:** Zack
**Audience:** Anne, Tim, Craig (client review)

## Purpose

A frontend-only, clickable demo of **ShopFlow's Current Work Sequence (CWS)** — the rolling 4-week schedule Anne builds today by manually merging six documents. The demo exists to show the client that the team understands the problem and can deliver. It is not a production app. It is the visual answer to Tim's written ask:

> "This end report is what I would like to see if you could produce." — *Client instructions.md, Step 4*

## Source of Truth

`Client instructions.md` is the authoritative requirement document. The transcript (`Trancript with client.md`) is background context that predates the instructions. Where the two conflict, the instructions win.

## What This Demo Proves

1. We understand Anne's morning routine: cross-checking Docs #1–5 + the order entry memo field to produce Doc #6.
2. Those six documents collapse into one live workspace.
3. Status gates and hard-date warnings catch the mistakes Anne catches manually today.
4. Capacity by department by week is visible at a glance (Tim's Doc #2, condensed).
5. Customer service can answer status questions from the same screen without paging Anne or Tim.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Lucide icons
- No backend. All data lives in TypeScript files under `src/data/`.
- Desktop-first. Mobile is not a target.

This matches the implementation defaults in `CLAUDE.md`.

## Non-Goals

The following are explicitly out of scope for this demo:

- Authentication / login
- Multi-screen navigation (no separate Capacity, Shipping, Engineering, or Order Detail pages — they collapse into the CWS row drawer)
- Real database, API, or persistence (state lives in memory; refresh resets the demo)
- Exports (PDF, Excel, print)
- Multi-user editing or real-time collaboration
- Drawings / CAD viewer
- Accounting, quoting, vendor PO management, BOM hierarchy, inventory
- Shop-floor time tracking
- Customer portal
- Forecasting beyond the rolling 4-week window
- Mobile responsive layout

## Screen Layout

One screen. Top to bottom:

### 1. Header bar

- App name: **ShopFlow**
- Screen title: **Current Work Sequence — Rolling 4 Weeks**
- Week-of selector (defaults to current week of demo)
- "Last updated" timestamp (mocked, static)
- View toggle: *Anne's view* (default, sorted by ship-week) | *Tim's view* (sorted capacity-first)

### 2. Capacity strip

A horizontal band representing **Doc #2 (MFG sched hours by week)** condensed to a glance.

- Grid: 12 departments (rows) × 4 weeks (columns)
- Each cell shows `scheduled / capacity` (e.g. `184 / 200`)
- Color tint:
  - Green: scheduled < 85% of capacity
  - Amber: scheduled 85–100% of capacity
  - Red: scheduled > 100% of capacity (overload)
- Hover a cell → tooltip lists the jobs contributing hours to that dept-week

### 3. Sequence table (the main event)

This is **Doc #6 (Current Work Sequence)** as a live, connected table.

**Sticky left columns (always visible while scrolling):**
- Status flag (colored dot + icon)
- MFG order #
- Customer name
- Ship date
- Square footage

**Scrollable right columns:**
- One column per department bucket (12 total). Each cell shows the hours assigned to that job for that department, blank if zero.

**Row grouping:**
- Rows are grouped into ship-weeks with a subtle divider and a week label band
- Within a week, rows are ordered by sequence priority (matches Anne's manual ordering)

**Row tint by status:**
- Yellow tint: in engineering / not yet released to shop (matches Anne's transcript description)
- Red tint: blocked on shortage OR hard-date risk
- Green tint: healthy, on track
- Gray tint: acknowledged to customer but not yet started

**Per-week capacity totals row:**
- At the bottom of each week group, a totals row shows hrs scheduled vs hrs available per department
- Mirrors what Anne does with manual sums today

**Row interactions:**
- Click any cell except the drag handle → opens job detail drawer (see below)
- Drag handle on the leftmost edge → drag-to-move (see "Wow Interaction" below)

### 4. Job detail drawer

Slides in from the right when a row is clicked. Width: ~480px. Overlay dims the rest of the screen lightly. Closes on Esc or backdrop click.

This drawer is where Anne's six-document cross-check collapses into one view.

**Contents:**

- **Job header**: MFG#, customer, contract title, square footage, ship date
- **Status timeline** (horizontal stepper):
  Drawings → Customer Approval → BOM in MRP → Vendor Ack → Shortage Clear → In Production
  Each step shows complete / in progress / pending with date stamps
- **Shortage list** (from Doc #5):
  Table of part / vendor / qty / ETA. Rows past ship-date prep window highlighted red.
- **Lori's note** (from Doc #3):
  Free text. Customer hard date called out as a pinned banner if present.
- **Engineering status** (from Doc #4, Mike's view):
  Drafter assigned, drawing rev, BOM completion %.
- **Department hour breakdown with worker assignment**:
  For each dept with hours on this job: hours + assigned worker(s) (e.g. "Tables: 24h — Joe + Marco"). Reflects the skill-aware assignment Anne does today (e.g. the two Corian guys).
- **Notes / audit log**:
  Static list of recent changes ("Anne moved from Wk 2 to Wk 3 on May 1 — reason: shortage on power unit").

### 5. Drag-to-move "wow" interaction

When the user drags a row to a different ship-week:

1. Capacity totals in the strip and per-week totals row recompute live during drag
2. On drop, validation runs:
   - Does the new ship-week violate a customer hard date from Lori?
   - Does the new ship-week land before the shortage clearance ETA?
   - Does the new ship-week push a department's capacity over 100%?
3. If any rule fails, a **modal blocks the move**:
   - Title: "This move breaks a rule"
   - Body: explicit description (e.g. *"Moving MFG #36284 to Week 3 violates Acme Corp's hard install date of May 28 (Lori, Apr 22)."*)
   - Actions: **Cancel** (default, undoes the move) or **Override** (requires typed reason → appended to job audit log)
4. If validation passes, the move applies silently and the audit log records it.

This single interaction is the demo's narrative climax: it collapses Anne's manual cross-check into three seconds and makes the gating explicit.

## Mock Data Strategy

All data is hand-crafted TypeScript in `src/data/`. The dataset is designed to tell a story, not to be realistic at scale.

**Volume:**
- 15–20 jobs spanning the rolling 4-week ship window
- 12 departments
- 8–12 named workers across the departments

**Story coverage (every state must be visible on the demo screen):**
- ≥ 1 job with a hard customer date that drag-validation will block
- ≥ 1 job blocked on shortage with a visible ETA past the prep window
- ≥ 1 job stuck in engineering (yellow row)
- ≥ 1 job acknowledged but not started (gray row)
- 2 dept-weeks tinted red on the capacity strip
- Majority of jobs healthy (green) so the broken ones pop visually

**Authenticity:**
- Customer names and project descriptions inspired by the transcript (JP Morgan Chase hardware tables, Baltimore project, etc.)
- MFG numbers in the same numeric range as Doc #1 (5-digit)
- Department buckets named to match the shop walk-through

**Department buckets (12):**
The exact names will be reconciled against the source documents during the planning phase. Working list from the transcript and PRD: Engineering / Drafting, Veneer Cutting, Press, CNC, Edge Banding, Sanding, Tables, Case Goods, Hand Clamping, Assembly, Finishing, Shipping.

## File Structure

```
src/
  App.tsx
  main.tsx
  index.css
  types.ts
  components/
    cws/
      CapacityStrip.tsx
      SequenceTable.tsx
      SequenceRow.tsx
      WeekGroupHeader.tsx
      WeekTotalsRow.tsx
      JobDrawer.tsx
      StatusFlag.tsx
      StatusTimeline.tsx
      ShortageList.tsx
      LoriNoteBanner.tsx
      DepartmentHoursList.tsx
      DragWarningModal.tsx
    ui/                  # shadcn/ui primitives
  data/
    mock-jobs.ts
    mock-departments.ts
    mock-workers.ts
    mock-shortages.ts
    mock-customers.ts
  lib/
    capacity-calc.ts     # totals, overload detection
    status-rules.ts      # row color from job state
    drag-validation.ts   # hard-date / shortage / capacity checks
    date-utils.ts
docs/
  superpowers/specs/
    2026-05-04-shopflow-demo-design.md   # this file
```

## Visual / UX Rules

Pulled from `FRONTEND_DESIGN_RULES.md` and `CLAUDE.md`:

- Operational manufacturing software feel — dense, calm, scan-friendly, spreadsheet-adjacent
- No landing page, no marketing hero, no decorative gradients
- Semantic risk colors: red = blocked / overdue, amber = warning, green = healthy
- Explicit states for every component: loading, empty, error, disabled, success
- Scheduling edits that break a rule must show a warning + leave an audit trail
- Recognizable successors to existing documents: capacity heatmap → Doc #2, sequence table → Doc #6, drawer fields → Docs #3, #4, #5

## Demo Walkthrough Script

The build is "done" when this 90-second walkthrough plays cleanly:

1. Open the page. Anne's view is default. Capacity strip shows two amber/red dept-weeks.
2. Hover a red capacity cell → tooltip lists the jobs causing the overload.
3. Click a healthy green row → drawer slides open. Walk through the timeline, shortage list, Lori note, dept-hour breakdown.
4. Close drawer. Click a yellow row → drawer shows engineering still in progress.
5. Click a red row → drawer pinned banner shows a hard customer date.
6. Drag this red-row job to a later ship-week → modal blocks: "This move breaks Acme Corp's hard install date of May 28."
7. Cancel the move. Drag a different healthy job to a later week → succeeds, capacity totals recompute.
8. Toggle to Tim's view → same data, capacity-first ordering.

If all eight beats land, the demo is done.

## Risks

- **Tim sends new sequenced source docs next week.** Demo data may need adjustment after that delivery. Mitigation: keep mock data centralized in `src/data/` so swapping is a one-file change.
- **Drag-and-drop interaction can feel janky on slow demo hardware.** Mitigation: use a battle-tested library (dnd-kit) rather than rolling our own.
- **Over-polishing the UI eats the timeline.** Mitigation: shadcn/ui defaults are good enough; resist custom design system work.
- **Department bucket names are uncertain.** Mitigation: confirm during planning by re-reading the source PDFs; if still uncertain, pick reasonable names and ask the client during the demo.

## Definition of Done

- All eight walkthrough beats execute without errors
- `npx tsc --noEmit` clean
- `npm run build` clean
- Lighthouse a11y score ≥ 90 (semantic HTML, keyboard nav for table + drawer)
- Demo runs locally with `npm run dev` — no env vars, no external services
- Spec and plan committed to git on a feature branch
