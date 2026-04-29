# CLAUDE.md

> **Read this file first, every session, before doing anything else.**

You are an AI engineering agent working on the **Production Cockpit Demo** — a frontend-only, click-through prototype for a custom millwork manufacturer (CCN). The full product spec is in `PRD_Production_Cockpit_Demo.md`. The technical setup is in `ARCHITECTURE.md`. The data shapes are in `DATA_MODEL.md`. Every concrete task is in `TASKS.md`. **This file** is the live kanban board and the rules of engagement.

If you do any front end design you must read @file {./FRONTEND_DESIGN_RULES.md}

---

## Project at a glance

- **What:** A single-screen React dashboard that shows ~25 mock manufacturing jobs as a master grid, with a department-by-week capacity heat map, a job detail drawer, and drag-to-reschedule. No backend. No auth. No persistence.
- **Why:** A demo to show CCN what consolidating their six daily-checked spreadsheets into one cockpit looks like, so they sign off on a real Phase 1.
- **Audience for the demo:** Anne (the production scheduler), Tim (operations owner), Lori (shipping). It will be run live on a laptop in a meeting room.
- **Done means:** It runs in `npm run dev`, every visual state in the PRD is reachable in ≤2 clicks, and a 5-minute walkthrough hits all the wow moments.

For the full product context, read `PRD_Production_Cockpit_Demo.md`.

---

## 🤖 Agent workflow — follow this every time

When you start a session, do these in order:

1. **Read this file (CLAUDE.md).** Look at `🚧 IN PROGRESS` and `📋 TODO` below.
2. **Pick a task** from `📋 TODO` whose dependencies are all in `✅ DONE`. If multiple are available, prefer lower-numbered tasks (lower phase = more foundational).
3. **Move it to `🚧 IN PROGRESS`** in this file. Edit CLAUDE.md and update the status. Add your agent identifier and start timestamp.
4. **Open `TASKS.md`** and find the full spec for that task ID. Read the acceptance criteria carefully.
5. **Read any other docs called out in the task** (usually `ARCHITECTURE.md` and/or `DATA_MODEL.md`).
6. **Do the work.** Stay inside the files-to-touch list in the task spec. If you need to touch other files, that's a signal — stop, re-read the spec, and either adjust your approach or add a note to the task.
7. **Verify against acceptance criteria.** Every checkbox in the task spec must be satisfied. Run `npm run build` and `npm run typecheck` (and `npm run lint` if available) before declaring done.
8. **Move the task to `✅ DONE`** in this file. Add a completion timestamp.
9. **If you discovered new work** along the way (a missing utility, a refactor, a bug), add a new task to `TASKS.md` in the appropriate phase, then add it to `📋 TODO` here.
10. **Commit** with the task ID in the message: `T2.2: master job grid component`.

---

## ✋ Rules

1. **One task per agent at a time.** Never have two tasks `🚧 IN PROGRESS` under the same agent identifier.
2. **Never start a task whose dependencies are not all `✅ DONE`.** If you really can't find anything to do, write a note in the `🚦 BLOCKED / NOTES` section instead of forcing it.
3. **Don't claim someone else's task.** If a task is `🚧 IN PROGRESS` under a different agent, leave it alone unless the timestamp is more than 24 hours old (assume abandoned).
4. **Don't expand scope silently.** If a task is bigger than the spec, stop and split it into multiple tasks in `TASKS.md`. Do not let a single task balloon.
5. **Don't introduce new dependencies.** The dependency list is in `ARCHITECTURE.md`. If you genuinely need a new one, write a note in `🚦 BLOCKED / NOTES` and stop.
6. **No backend code, ever.** No `fetch`, no API calls, no servers, no env vars for secrets. All data comes from `src/data/`.
7. **No persistence.** No `localStorage`, no `sessionStorage`, no cookies. State is in-memory via Zustand. Reset on page refresh is a feature, not a bug.
8. **Do not hand-write status flags.** All flag values are computed from the rules in `DATA_MODEL.md`. If you find yourself typing a literal flag value into mock data, you're doing it wrong.
9. **Match CCN's vocabulary.** "Press date" not "production start." "Sq ft" not "scope units." "Wedge conf table" not "asset." See `ARCHITECTURE.md` § Vocabulary.
10. **Update CLAUDE.md atomically.** When moving a task between sections, edit both lines in a single change to avoid races with other agents.

---

## 🚧 IN PROGRESS

<!-- Agents: when you start a task, MOVE its line from 📋 TODO to here. Format:
- [ ] **TX.X** — Task title · `agent-name` · started YYYY-MM-DD HH:MM
-->

_(none)_

---

## 📋 TODO

### Phase 0 — Project setup (sequential, blocks everything)

- [x] **T0.1** — Initialize Vite + React + TypeScript project
- [x] **T0.2** — Install runtime and dev dependencies
- [x] **T0.3** — Configure TailwindCSS
- [x] **T0.4** — Initialize shadcn/ui and add base components
- [x] **T0.5** — Create folder structure and TypeScript path aliases
- [x] **T0.6** — Build base layout shell (App.tsx + Layout component)

### Phase 1 — Data layer (parallel after T0.5)

- [ ] **T1.1** — Define all TypeScript types in `src/data/types.ts` _(depends on T0.5)_
- [ ] **T1.2** — Generate mock jobs data (25 jobs) _(depends on T1.1)_
- [ ] **T1.3** — Generate mock department-capacity data (12 weeks × 10 departments) _(depends on T1.1)_
- [ ] **T1.4** — Implement `computeStatusFlag()` in `src/lib/status-flags.ts` _(depends on T1.1)_
- [ ] **T1.5** — Implement `computeCapacity()` in `src/lib/capacity-calc.ts` _(depends on T1.1, T1.3)_
- [ ] **T1.6** — Set up Zustand store in `src/lib/store.ts` _(depends on T1.1)_

### Phase 2 — Core UI components (parallel after Phase 1)

- [ ] **T2.1** — KPI strip (top of screen, 5 tiles) _(depends on T0.6, T1.5, T1.6)_
- [ ] **T2.2** — Master job grid using TanStack Table _(depends on T0.6, T1.2, T1.4, T1.6)_
- [ ] **T2.3** — Status flag badge component _(depends on T0.6, T1.1, T1.4)_
- [ ] **T2.4** — Department capacity heat map _(depends on T0.6, T1.3, T1.5, T1.6)_
- [ ] **T2.5** — Job detail drawer shell (slide-out from right) _(depends on T0.6, T1.6)_
- [ ] **T2.6** — Filter bar component (search input + filter chips) _(depends on T0.6, T1.6)_

### Phase 3 — Drawer subcomponents (parallel after T2.5)

- [ ] **T3.1** — Drawer: Header section (job#, customer, ship date, $$, location) _(depends on T2.5)_
- [ ] **T3.2** — Drawer: Status explanation block (computed reasoning) _(depends on T2.5, T1.4)_
- [ ] **T3.3** — Drawer: Engineering section _(depends on T2.5)_
- [ ] **T3.4** — Drawer: Materials section _(depends on T2.5)_
- [ ] **T3.5** — Drawer: Department hours section (with bar viz) _(depends on T2.5)_
- [ ] **T3.6** — Drawer: Customer notes section _(depends on T2.5)_
- [ ] **T3.7** — Drawer: Team assignment section _(depends on T2.5)_

### Phase 4 — Interactivity (after Phase 2)

- [ ] **T4.1** — Drag-to-reschedule (drag a job to a new week, heat map updates live) _(depends on T2.2, T2.4)_
- [ ] **T4.2** — Click heat-map cell to filter grid _(depends on T2.2, T2.4)_
- [ ] **T4.3** — Column sorting in master grid _(depends on T2.2)_
- [ ] **T4.4** — Filter chips (Red only / Yellow only / Hard date / On hold) _(depends on T2.6)_
- [ ] **T4.5** — Search by job # or customer _(depends on T2.6)_
- [ ] **T4.6** — Job selection / drawer open-close wiring _(depends on T2.2, T2.5)_

### Phase 5 — Polish

- [ ] **T5.1** — Animations and transitions on drawer + heat-map cells _(depends on Phase 2 done)_
- [ ] **T5.2** — Loading skeleton on first paint (purely visual; data is synchronous) _(depends on Phase 2 done)_
- [ ] **T5.3** — Empty state when filters return zero jobs _(depends on T4.4, T4.5)_
- [ ] **T5.4** — Reset-demo button (re-init Zustand from mock data) _(depends on T1.6)_
- [ ] **T5.5** — "Synced 2 min ago" badge (static, near KPI strip) _(depends on T2.1)_
- [ ] **T5.6** — Print-friendly view (`@media print` rules) _(depends on Phase 2 done)_
- [ ] **T5.7** — First-visit walkthrough callouts (a single tooltip series) _(depends on Phase 2 done)_

### Phase 6 — Stubs (deliberately non-functional buttons that LOOK real)

These exist so the demo feels complete and Anne can imagine the future state. Each one renders a button or icon that, when clicked, shows a toast like "(would notify Lori in production)" or similar. None of them should actually do anything beyond the toast.

- [ ] **T6.1** — "+ Add Job" button stub (top-right of header)
- [ ] **T6.2** — "Notify Lori" stub on slipping jobs in the drawer
- [ ] **T6.3** — "Export to Excel" stub in the toolbar
- [ ] **T6.4** — User avatar / login stub in the top-right
- [ ] **T6.5** — Settings gear stub (opens an empty modal saying "Coming in Phase 1")
- [ ] **T6.6** — Refresh icon stub next to "Synced 2 min ago"

---

## ✅ DONE

<!-- Agents: when you complete a task, MOVE its line here. Format:
- [x] **TX.X** — Task title · completed YYYY-MM-DD HH:MM by `agent-name`
-->

- [x] **T0.1** — Initialize Vite + React + TypeScript project · completed 2026-04-29 by `claude-main`
- [x] **T0.2** — Install runtime and dev dependencies · completed 2026-04-29 by `claude-main`
- [x] **T0.3** — Configure TailwindCSS · completed 2026-04-29 by `claude-main`
- [x] **T0.4** — Initialize shadcn/ui and add base components · completed 2026-04-29 by `claude-main`
- [x] **T0.5** — Create folder structure and TypeScript path aliases · completed 2026-04-29 by `claude-main`
- [x] **T0.6** — Build base layout shell (App.tsx + Layout component) · completed 2026-04-29 by `claude-main`

---

## 🚦 BLOCKED / NOTES

<!-- Agents: if you find yourself stuck, blocked, or wanting to add a dependency,
write a brief note here instead of forcing the work. Format:
- [date] note (agent-name)
-->

_(empty)_

---

## 🔗 Quick links

| Doc | What it has |
|---|---|
| `PRD_Production_Cockpit_Demo.md` | Full product spec, user personas, success metrics, future phases |
| `ARCHITECTURE.md` | Tech stack, folder structure, naming conventions, dependency list |
| `DATA_MODEL.md` | TypeScript types, mock data shape, status-flag rules, capacity-calc rules |
| `TASKS.md` | Full atomic spec for every TX.X task — read before starting any task |

---

## 🧠 Things to keep in your head while working

- **This is a demo, not a product.** Every architectural decision should optimize for "5-minute live walkthrough impresses Anne and Tim," not "scales to 10,000 users."
- **The wow moments are: computed flags, the heat map, drag-to-reschedule.** If you have to cut corners, cut them somewhere else.
- **Anne lives in spreadsheets.** Dense, fast, information-rich beats clean and minimal. Bloomberg Terminal energy, not Linear.
- **Use real CCN data.** Real job numbers (36254, 36306, 36287, 36266 …), real customer names (Evnbst, JCWht, Spncer, Kirkland, Baupost, A16Z…), real shortages. The PRD § "What the data reveals" lists specific examples to include.
- **The status flag's reason must be explainable.** Every flag in the drawer's status-explanation section must trace to a concrete rule in `DATA_MODEL.md`. No magic.
