# ShopFlow Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a frontend-only, clickable demo of ShopFlow's Current Work Sequence — one screen with capacity strip, sequence table, job detail drawer, and drag-to-move with hard-date / shortage / capacity gating.

**Architecture:** Single-page React app. All state in a `useState` hook in `App.tsx`. Mock data in TypeScript files. Three pure-logic libs (`capacity-calc`, `status-rules`, `drag-validation`) are unit-tested with Vitest. Components are integration-tested via the final walkthrough QA — no per-component tests, this is a demo.

**Tech Stack:** Vite, React 18, TypeScript 5, Tailwind CSS, shadcn/ui, Lucide, dnd-kit, Vitest.

**Spec:** `docs/superpowers/specs/2026-05-04-shopflow-demo-design.md`

---

## File Structure (locked in before tasks)

```
package.json
tsconfig.json
tsconfig.node.json
vite.config.ts
tailwind.config.js
postcss.config.js
components.json                 # shadcn/ui
index.html
src/
  main.tsx                      # React root
  App.tsx                       # Single-screen shell + state
  index.css                     # Tailwind directives + theme tokens
  types.ts                      # All shared types
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
    ui/                         # shadcn/ui primitives (Sheet, Dialog, Button, Tooltip)
  data/
    mock-departments.ts
    mock-workers.ts
    mock-customers.ts
    mock-shortages.ts
    mock-jobs.ts
  lib/
    utils.ts                    # cn() helper
    capacity-calc.ts
    status-rules.ts
    drag-validation.ts
    date-utils.ts
src/lib/__tests__/
  capacity-calc.test.ts
  status-rules.test.ts
  drag-validation.test.ts
```

---

## Demo Time Window (fixed across the build)

The demo's "today" is **Monday 2026-05-04**. The rolling 4-week window:

- Week 1: 2026-05-04 → 2026-05-10
- Week 2: 2026-05-11 → 2026-05-17
- Week 3: 2026-05-18 → 2026-05-24
- Week 4: 2026-05-25 → 2026-05-31

These are referenced as `weekIndex: 1 | 2 | 3 | 4` throughout.

---

## Department Buckets (12, fixed)

```ts
type DepartmentId =
  | 'engineering'
  | 'veneer'
  | 'press'
  | 'cnc'
  | 'edge_banding'
  | 'sanding'
  | 'tables'
  | 'case_goods'
  | 'hand_clamp'
  | 'assembly'
  | 'finishing'
  | 'shipping';
```

Display names: Engineering, Veneer Cutting, Press, CNC, Edge Banding, Sanding, Tables, Case Goods, Hand Clamping, Assembly, Finishing, Shipping.

---

## Task 1: Scaffold Vite + React + TypeScript

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `.gitignore`

- [ ] **Step 1.1: Initialize Vite scaffold**

Run from project root:

```bash
npm create vite@latest . -- --template react-ts
```

When prompted to overwrite the directory, choose **Ignore files and continue**. This preserves all existing markdown docs.

- [ ] **Step 1.2: Install scaffold deps**

```bash
npm install
```

- [ ] **Step 1.3: Replace `src/App.tsx` with placeholder shell**

```tsx
// src/App.tsx
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <h1 className="p-4 text-lg font-semibold">ShopFlow</h1>
    </div>
  );
}
```

- [ ] **Step 1.4: Verify dev server boots**

```bash
npm run dev
```

Expected: Vite prints a local URL. Open it. You should see "ShopFlow" on a slate background. Stop the server with Ctrl+C.

- [ ] **Step 1.5: Verify typecheck and build pass**

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 1.6: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/ .gitignore
git commit -m "scaffold: Vite + React + TS"
```

---

## Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/index.css`, `src/App.tsx`

- [ ] **Step 2.1: Install Tailwind**

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2.2: Configure `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2.3: Replace `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  font-feature-settings: 'cv11', 'tnum';
}
```

- [ ] **Step 2.4: Verify Tailwind works**

Update `src/App.tsx`:

```tsx
export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-base font-semibold tracking-tight">ShopFlow</h1>
      </header>
    </div>
  );
}
```

Run `npm run dev`. The header should render with a white background, slate border, and tight font. Stop server.

- [ ] **Step 2.5: Commit**

```bash
git add tailwind.config.js postcss.config.js src/index.css src/App.tsx package.json package-lock.json
git commit -m "feat(scaffold): add Tailwind CSS"
```

---

## Task 3: Add shadcn/ui primitives + utils

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/{button,sheet,dialog,tooltip}.tsx`
- Modify: `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`

- [ ] **Step 3.1: Configure path alias `@/*`**

In `tsconfig.json`, add inside `compilerOptions`:

```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

In `vite.config.ts`:

```ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 3.2: Install shadcn/ui dependencies**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-slot
npm install -D @types/node
```

- [ ] **Step 3.3: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3.4: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": false
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

- [ ] **Step 3.5: Add shadcn/ui components**

```bash
npx shadcn@latest add button sheet dialog tooltip
```

Accept defaults. This creates `src/components/ui/{button,sheet,dialog,tooltip}.tsx`.

- [ ] **Step 3.6: Verify typecheck and build**

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 3.7: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui/ tsconfig.json vite.config.ts package.json package-lock.json
git commit -m "feat(scaffold): add shadcn/ui primitives (button, sheet, dialog, tooltip)"
```

---

## Task 4: Add Vitest + dnd-kit

**Files:**
- Modify: `package.json`, `vite.config.ts`
- Create: `src/lib/__tests__/.gitkeep`

- [ ] **Step 4.1: Install Vitest and dnd-kit**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 4.2: Add test script to `package.json`**

In `package.json` `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4.3: Configure Vitest in `vite.config.ts`**

```ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 4.4: Verify Vitest runs (with no tests yet)**

```bash
mkdir -p src/lib/__tests__
touch src/lib/__tests__/.gitkeep
npm test
```

Expected: Vitest exits cleanly with "No test files found" (or similar — exit code 0 acceptable, exit code 1 with that message also acceptable; we'll add real tests next).

- [ ] **Step 4.5: Commit**

```bash
git add vite.config.ts package.json package-lock.json src/lib/__tests__/.gitkeep
git commit -m "feat(scaffold): add Vitest + dnd-kit"
```

---

## Task 5: Define shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 5.1: Write `src/types.ts`**

```ts
export type DepartmentId =
  | 'engineering'
  | 'veneer'
  | 'press'
  | 'cnc'
  | 'edge_banding'
  | 'sanding'
  | 'tables'
  | 'case_goods'
  | 'hand_clamp'
  | 'assembly'
  | 'finishing'
  | 'shipping';

export interface Department {
  id: DepartmentId;
  name: string;
  weeklyCapacityHours: number;
}

export interface Worker {
  id: string;
  name: string;
  departments: DepartmentId[];
  specialties?: string[];
}

export interface Customer {
  id: string;
  name: string;
}

export type JobStatus =
  | 'in_engineering'
  | 'acknowledged'
  | 'in_production'
  | 'blocked';

export interface ShortagePart {
  partName: string;
  vendor: string;
  qty: number;
  etaDate: string; // ISO yyyy-mm-dd
}

export interface DepartmentHours {
  departmentId: DepartmentId;
  hours: number;
  workerIds: string[];
}

export interface AuditEntry {
  date: string;
  user: string;
  action: string;
  reason?: string;
}

export type WeekIndex = 1 | 2 | 3 | 4;

export interface Job {
  id: string;
  mfgNumber: string;
  customerId: string;
  contractTitle: string;
  squareFootage: number;
  shipDate: string;
  shipWeek: WeekIndex;
  hardCustomerDate?: string;
  hardDateNote?: string;
  loriNote?: string;
  status: JobStatus;
  drawingsApprovedDate?: string;
  bomCompleteDate?: string;
  vendorAckDate?: string;
  drafterId?: string;
  drawingRev?: string;
  bomCompletionPercent?: number;
  shortages: ShortagePart[];
  departmentHours: DepartmentHours[];
  auditLog: AuditEntry[];
}

export interface DeptWeekCapacity {
  departmentId: DepartmentId;
  week: WeekIndex;
  scheduledHours: number;
  capacityHours: number;
  utilizationPercent: number;
  status: 'green' | 'amber' | 'red';
}

export type DragValidationFailureType = 'hard_date' | 'shortage' | 'capacity';

export interface DragValidationFailure {
  type: DragValidationFailureType;
  message: string;
  details?: string;
}

export type DragValidationResult =
  | { ok: true }
  | { ok: false; failures: DragValidationFailure[] };
```

- [ ] **Step 5.2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 5.3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): shared types for jobs, departments, capacity, validation"
```

---

## Task 6: Mock departments, workers, customers, shortages

**Files:**
- Create: `src/data/mock-departments.ts`, `src/data/mock-workers.ts`, `src/data/mock-customers.ts`

- [ ] **Step 6.1: Write `src/data/mock-departments.ts`**

```ts
import type { Department } from '@/types';

export const DEPARTMENTS: Department[] = [
  { id: 'engineering',  name: 'Engineering',    weeklyCapacityHours: 120 },
  { id: 'veneer',       name: 'Veneer Cutting', weeklyCapacityHours: 80 },
  { id: 'press',        name: 'Press',          weeklyCapacityHours: 80 },
  { id: 'cnc',          name: 'CNC',            weeklyCapacityHours: 100 },
  { id: 'edge_banding', name: 'Edge Banding',   weeklyCapacityHours: 60 },
  { id: 'sanding',      name: 'Sanding',        weeklyCapacityHours: 80 },
  { id: 'tables',       name: 'Tables',         weeklyCapacityHours: 200 },
  { id: 'case_goods',   name: 'Case Goods',     weeklyCapacityHours: 200 },
  { id: 'hand_clamp',   name: 'Hand Clamping',  weeklyCapacityHours: 60 },
  { id: 'assembly',     name: 'Assembly',       weeklyCapacityHours: 140 },
  { id: 'finishing',    name: 'Finishing',      weeklyCapacityHours: 120 },
  { id: 'shipping',     name: 'Shipping',       weeklyCapacityHours: 60 },
];

export const TOTAL_WEEKLY_CAPACITY = DEPARTMENTS.reduce(
  (sum, d) => sum + d.weeklyCapacityHours,
  0,
); // Should land near 1300 — matches client transcript "1234 hrs/wk"
```

- [ ] **Step 6.2: Write `src/data/mock-workers.ts`**

```ts
import type { Worker } from '@/types';

export const WORKERS: Worker[] = [
  { id: 'w_joe',     name: 'Joe',     departments: ['tables', 'assembly'] },
  { id: 'w_marco',   name: 'Marco',   departments: ['tables', 'case_goods'] },
  { id: 'w_dani',    name: 'Dani',    departments: ['case_goods', 'assembly'], specialties: ['corian'] },
  { id: 'w_lee',     name: 'Lee',     departments: ['case_goods'], specialties: ['corian'] },
  { id: 'w_pat',     name: 'Pat',     departments: ['veneer', 'press'] },
  { id: 'w_kim',     name: 'Kim',     departments: ['cnc', 'edge_banding'] },
  { id: 'w_sam',     name: 'Sam',     departments: ['sanding', 'hand_clamp'] },
  { id: 'w_alex',    name: 'Alex',    departments: ['finishing'] },
  { id: 'w_morgan',  name: 'Morgan',  departments: ['finishing', 'shipping'] },
  { id: 'w_taylor',  name: 'Taylor',  departments: ['engineering'] },
  { id: 'w_riley',   name: 'Riley',   departments: ['engineering'] },
];
```

- [ ] **Step 6.3: Write `src/data/mock-customers.ts`**

```ts
import type { Customer } from '@/types';

export const CUSTOMERS: Customer[] = [
  { id: 'c_jpm',       name: 'JP Morgan Chase' },
  { id: 'c_baltimore', name: 'Baltimore Federal' },
  { id: 'c_acme',      name: 'Acme Hospitality Group' },
  { id: 'c_lex',       name: 'Lexington Capital' },
  { id: 'c_meridian',  name: 'Meridian Architects' },
  { id: 'c_oakwood',   name: 'Oakwood Hotels' },
  { id: 'c_drexel',    name: 'Drexel & Sons' },
  { id: 'c_summit',    name: 'Summit Law Group' },
  { id: 'c_harbor',    name: 'Harbor Point Realty' },
  { id: 'c_atlas',     name: 'Atlas Office Interiors' },
];
```

- [ ] **Step 6.4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6.5: Commit**

```bash
git add src/data/
git commit -m "feat(data): mock departments, workers, customers"
```

---

## Task 7: Mock jobs (story-driven)

**Files:**
- Create: `src/data/mock-jobs.ts`

The dataset must hit every state from the spec's "Story coverage" requirements. 18 jobs total.

- [ ] **Step 7.1: Write `src/data/mock-jobs.ts`**

```ts
import type { Job } from '@/types';

// Demo "today" = 2026-05-04. Weeks: 1=05-04..05-10, 2=05-11..05-17, 3=05-18..05-24, 4=05-25..05-31

export const JOBS: Job[] = [
  // ── Week 1 ────────────────────────────────────────────────────────────────
  {
    id: 'j_36281',
    mfgNumber: '36281',
    customerId: 'c_jpm',
    contractTitle: 'JPM Hardware Tables — Lot 14',
    squareFootage: 0,
    shipDate: '2026-05-08',
    shipWeek: 1,
    status: 'in_production',
    drawingsApprovedDate: '2026-04-10',
    bomCompleteDate: '2026-04-15',
    vendorAckDate: '2026-04-18',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'tables', hours: 40, workerIds: ['w_joe', 'w_marco'] },
      { departmentId: 'finishing', hours: 12, workerIds: ['w_alex'] },
      { departmentId: 'shipping', hours: 4, workerIds: ['w_morgan'] },
    ],
    auditLog: [
      { date: '2026-04-22', user: 'Anne', action: 'Sequenced into Week 1' },
    ],
  },
  {
    id: 'j_36284',
    mfgNumber: '36284',
    customerId: 'c_acme',
    contractTitle: 'Acme HQ Reception Wall',
    squareFootage: 420,
    shipDate: '2026-05-08',
    shipWeek: 1,
    status: 'blocked',
    hardCustomerDate: '2026-05-28',
    hardDateNote: 'Install crew + electricians booked May 28 — cannot move',
    loriNote: 'Acme called Apr 22 — install must hit May 28, no flex',
    drawingsApprovedDate: '2026-04-05',
    bomCompleteDate: '2026-04-12',
    vendorAckDate: '2026-04-20',
    bomCompletionPercent: 100,
    shortages: [
      { partName: 'Power unit PWR-X240', vendor: 'Hafele', qty: 6, etaDate: '2026-05-15' },
    ],
    departmentHours: [
      { departmentId: 'press', hours: 16, workerIds: ['w_pat'] },
      { departmentId: 'cnc', hours: 18, workerIds: ['w_kim'] },
      { departmentId: 'case_goods', hours: 64, workerIds: ['w_dani', 'w_lee'] },
      { departmentId: 'assembly', hours: 24, workerIds: ['w_joe'] },
      { departmentId: 'finishing', hours: 16, workerIds: ['w_alex'] },
    ],
    auditLog: [
      { date: '2026-04-25', user: 'Lori', action: 'Hard date locked: 2026-05-28' },
      { date: '2026-05-01', user: 'Anne', action: 'Flagged blocked — power unit ETA 5/15' },
    ],
  },
  {
    id: 'j_36287',
    mfgNumber: '36287',
    customerId: 'c_summit',
    contractTitle: 'Summit Conf Room Suite A',
    squareFootage: 280,
    shipDate: '2026-05-09',
    shipWeek: 1,
    status: 'in_production',
    drawingsApprovedDate: '2026-04-08',
    bomCompleteDate: '2026-04-14',
    vendorAckDate: '2026-04-22',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'veneer', hours: 12, workerIds: ['w_pat'] },
      { departmentId: 'press', hours: 14, workerIds: ['w_pat'] },
      { departmentId: 'sanding', hours: 10, workerIds: ['w_sam'] },
      { departmentId: 'case_goods', hours: 38, workerIds: ['w_marco'] },
      { departmentId: 'finishing', hours: 18, workerIds: ['w_alex'] },
    ],
    auditLog: [{ date: '2026-04-22', user: 'Anne', action: 'Sequenced into Week 1' }],
  },
  {
    id: 'j_36290',
    mfgNumber: '36290',
    customerId: 'c_jpm',
    contractTitle: 'JPM Hardware Tables — Lot 15',
    squareFootage: 0,
    shipDate: '2026-05-10',
    shipWeek: 1,
    status: 'in_production',
    drawingsApprovedDate: '2026-04-12',
    bomCompleteDate: '2026-04-16',
    vendorAckDate: '2026-04-19',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'tables', hours: 38, workerIds: ['w_joe'] },
      { departmentId: 'finishing', hours: 10, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },

  // ── Week 2 ────────────────────────────────────────────────────────────────
  {
    id: 'j_36295',
    mfgNumber: '36295',
    customerId: 'c_baltimore',
    contractTitle: 'Baltimore Federal — Branch 3 Counters',
    squareFootage: 640,
    shipDate: '2026-05-15',
    shipWeek: 2,
    status: 'in_production',
    drawingsApprovedDate: '2026-04-01',
    bomCompleteDate: '2026-04-08',
    vendorAckDate: '2026-04-15',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'veneer', hours: 18, workerIds: ['w_pat'] },
      { departmentId: 'press', hours: 22, workerIds: ['w_pat'] },
      { departmentId: 'cnc', hours: 26, workerIds: ['w_kim'] },
      { departmentId: 'case_goods', hours: 80, workerIds: ['w_marco', 'w_dani'] },
      { departmentId: 'finishing', hours: 28, workerIds: ['w_alex', 'w_morgan'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36298',
    mfgNumber: '36298',
    customerId: 'c_lex',
    contractTitle: 'Lex Capital Boardroom Table',
    squareFootage: 90,
    shipDate: '2026-05-15',
    shipWeek: 2,
    status: 'acknowledged',
    drawingsApprovedDate: '2026-04-18',
    bomCompleteDate: '2026-04-25',
    vendorAckDate: '2026-04-30',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'tables', hours: 60, workerIds: ['w_joe', 'w_marco'] },
      { departmentId: 'finishing', hours: 22, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36302',
    mfgNumber: '36302',
    customerId: 'c_oakwood',
    contractTitle: 'Oakwood Lobby Reception',
    squareFootage: 380,
    shipDate: '2026-05-16',
    shipWeek: 2,
    status: 'in_engineering',
    drafterId: 'w_taylor',
    drawingRev: 'Rev B',
    bomCompletionPercent: 60,
    shortages: [],
    departmentHours: [
      { departmentId: 'engineering', hours: 24, workerIds: ['w_taylor'] },
      { departmentId: 'press', hours: 16, workerIds: ['w_pat'] },
      { departmentId: 'case_goods', hours: 70, workerIds: ['w_dani'] },
      { departmentId: 'finishing', hours: 20, workerIds: ['w_alex'] },
    ],
    auditLog: [
      { date: '2026-04-28', user: 'Mike', action: 'Drawing Rev B sent to customer' },
    ],
  },
  {
    id: 'j_36305',
    mfgNumber: '36305',
    customerId: 'c_atlas',
    contractTitle: 'Atlas Bench Run — 12 Units',
    squareFootage: 0,
    shipDate: '2026-05-17',
    shipWeek: 2,
    status: 'in_production',
    drawingsApprovedDate: '2026-04-10',
    bomCompleteDate: '2026-04-17',
    vendorAckDate: '2026-04-22',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'tables', hours: 44, workerIds: ['w_marco'] },
      { departmentId: 'sanding', hours: 12, workerIds: ['w_sam'] },
      { departmentId: 'finishing', hours: 16, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },

  // ── Week 3 ────────────────────────────────────────────────────────────────
  {
    id: 'j_36312',
    mfgNumber: '36312',
    customerId: 'c_meridian',
    contractTitle: 'Meridian Office Suite — Floor 4',
    squareFootage: 1100,
    shipDate: '2026-05-22',
    shipWeek: 3,
    status: 'in_production',
    drawingsApprovedDate: '2026-03-25',
    bomCompleteDate: '2026-04-01',
    vendorAckDate: '2026-04-08',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'veneer', hours: 32, workerIds: ['w_pat'] },
      { departmentId: 'press', hours: 38, workerIds: ['w_pat'] },
      { departmentId: 'cnc', hours: 46, workerIds: ['w_kim'] },
      { departmentId: 'edge_banding', hours: 24, workerIds: ['w_kim'] },
      { departmentId: 'case_goods', hours: 140, workerIds: ['w_dani', 'w_lee', 'w_marco'] },
      { departmentId: 'assembly', hours: 60, workerIds: ['w_joe'] },
      { departmentId: 'finishing', hours: 48, workerIds: ['w_alex', 'w_morgan'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36315',
    mfgNumber: '36315',
    customerId: 'c_drexel',
    contractTitle: 'Drexel Library Bookcases',
    squareFootage: 520,
    shipDate: '2026-05-22',
    shipWeek: 3,
    status: 'in_engineering',
    drafterId: 'w_riley',
    drawingRev: 'Rev A',
    bomCompletionPercent: 30,
    shortages: [],
    departmentHours: [
      { departmentId: 'engineering', hours: 32, workerIds: ['w_riley'] },
      { departmentId: 'cnc', hours: 22, workerIds: ['w_kim'] },
      { departmentId: 'case_goods', hours: 80, workerIds: ['w_marco'] },
      { departmentId: 'finishing', hours: 24, workerIds: ['w_alex'] },
    ],
    auditLog: [
      { date: '2026-04-30', user: 'Mike', action: 'Drawing Rev A under customer review' },
    ],
  },
  {
    id: 'j_36318',
    mfgNumber: '36318',
    customerId: 'c_harbor',
    contractTitle: 'Harbor Point — Concierge Desk',
    squareFootage: 180,
    shipDate: '2026-05-23',
    shipWeek: 3,
    status: 'acknowledged',
    drawingsApprovedDate: '2026-04-22',
    bomCompleteDate: '2026-04-28',
    vendorAckDate: '2026-05-02',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'press', hours: 12, workerIds: ['w_pat'] },
      { departmentId: 'case_goods', hours: 48, workerIds: ['w_dani'] },
      { departmentId: 'hand_clamp', hours: 14, workerIds: ['w_sam'] },
      { departmentId: 'finishing', hours: 18, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36322',
    mfgNumber: '36322',
    customerId: 'c_summit',
    contractTitle: 'Summit Conf Room Suite B',
    squareFootage: 260,
    shipDate: '2026-05-24',
    shipWeek: 3,
    status: 'in_production',
    drawingsApprovedDate: '2026-04-12',
    bomCompleteDate: '2026-04-18',
    vendorAckDate: '2026-04-26',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'veneer', hours: 10, workerIds: ['w_pat'] },
      { departmentId: 'press', hours: 12, workerIds: ['w_pat'] },
      { departmentId: 'case_goods', hours: 36, workerIds: ['w_marco'] },
      { departmentId: 'finishing', hours: 16, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },

  // ── Week 4 ────────────────────────────────────────────────────────────────
  {
    id: 'j_36328',
    mfgNumber: '36328',
    customerId: 'c_acme',
    contractTitle: 'Acme HQ — Phase 2 Reception',
    squareFootage: 360,
    shipDate: '2026-05-29',
    shipWeek: 4,
    status: 'acknowledged',
    drawingsApprovedDate: '2026-04-15',
    bomCompleteDate: '2026-04-22',
    vendorAckDate: '2026-04-28',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'press', hours: 16, workerIds: ['w_pat'] },
      { departmentId: 'cnc', hours: 18, workerIds: ['w_kim'] },
      { departmentId: 'case_goods', hours: 56, workerIds: ['w_dani', 'w_lee'] },
      { departmentId: 'finishing', hours: 18, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36331',
    mfgNumber: '36331',
    customerId: 'c_baltimore',
    contractTitle: 'Baltimore Federal — Branch 4 Counters',
    squareFootage: 640,
    shipDate: '2026-05-29',
    shipWeek: 4,
    status: 'in_engineering',
    drafterId: 'w_taylor',
    drawingRev: 'Rev A',
    bomCompletionPercent: 50,
    shortages: [],
    departmentHours: [
      { departmentId: 'engineering', hours: 28, workerIds: ['w_taylor'] },
      { departmentId: 'veneer', hours: 18, workerIds: ['w_pat'] },
      { departmentId: 'press', hours: 22, workerIds: ['w_pat'] },
      { departmentId: 'case_goods', hours: 80, workerIds: ['w_marco'] },
      { departmentId: 'finishing', hours: 28, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36334',
    mfgNumber: '36334',
    customerId: 'c_oakwood',
    contractTitle: 'Oakwood Lobby — Reception Desk',
    squareFootage: 220,
    shipDate: '2026-05-30',
    shipWeek: 4,
    status: 'acknowledged',
    drawingsApprovedDate: '2026-04-26',
    bomCompleteDate: '2026-05-01',
    vendorAckDate: '2026-05-04',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'press', hours: 14, workerIds: ['w_pat'] },
      { departmentId: 'case_goods', hours: 50, workerIds: ['w_dani'] },
      { departmentId: 'assembly', hours: 18, workerIds: ['w_joe'] },
      { departmentId: 'finishing', hours: 16, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36337',
    mfgNumber: '36337',
    customerId: 'c_jpm',
    contractTitle: 'JPM Hardware Tables — Lot 16',
    squareFootage: 0,
    shipDate: '2026-05-31',
    shipWeek: 4,
    status: 'acknowledged',
    drawingsApprovedDate: '2026-04-20',
    bomCompleteDate: '2026-04-25',
    vendorAckDate: '2026-04-30',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'tables', hours: 40, workerIds: ['w_marco'] },
      { departmentId: 'finishing', hours: 12, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },
  {
    id: 'j_36340',
    mfgNumber: '36340',
    customerId: 'c_lex',
    contractTitle: 'Lex Capital — Pantry Cabinets',
    squareFootage: 140,
    shipDate: '2026-05-31',
    shipWeek: 4,
    status: 'acknowledged',
    drawingsApprovedDate: '2026-04-24',
    bomCompleteDate: '2026-04-29',
    vendorAckDate: '2026-05-02',
    bomCompletionPercent: 100,
    shortages: [],
    departmentHours: [
      { departmentId: 'press', hours: 10, workerIds: ['w_pat'] },
      { departmentId: 'case_goods', hours: 32, workerIds: ['w_dani'] },
      { departmentId: 'finishing', hours: 12, workerIds: ['w_alex'] },
    ],
    auditLog: [],
  },
];
```

> **Story-coverage check (manual):** j_36284 is the hard-date conflict + active shortage. j_36302, j_36315, j_36331 are in engineering (yellow). j_36298, j_36318, j_36328, j_36334, j_36337, j_36340 are acknowledged but not started (gray). Tables and Case Goods hour totals across weeks should produce one or two amber/red dept-week cells in Task 8's capacity calc.

- [ ] **Step 7.2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7.3: Commit**

```bash
git add src/data/mock-jobs.ts
git commit -m "feat(data): 18 mock jobs with full state coverage"
```

---

## Task 8: capacity-calc lib (TDD)

**Files:**
- Create: `src/lib/capacity-calc.ts`, `src/lib/__tests__/capacity-calc.test.ts`

- [ ] **Step 8.1: Write failing test**

`src/lib/__tests__/capacity-calc.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeCapacityGrid } from '../capacity-calc';
import { DEPARTMENTS } from '@/data/mock-departments';
import type { Job } from '@/types';

const job = (overrides: Partial<Job>): Job => ({
  id: 'j_test',
  mfgNumber: '00000',
  customerId: 'c_test',
  contractTitle: 'Test',
  squareFootage: 0,
  shipDate: '2026-05-08',
  shipWeek: 1,
  status: 'in_production',
  shortages: [],
  departmentHours: [],
  auditLog: [],
  ...overrides,
});

describe('computeCapacityGrid', () => {
  it('returns 12 departments × 4 weeks = 48 cells', () => {
    const grid = computeCapacityGrid([], DEPARTMENTS);
    expect(grid).toHaveLength(48);
  });

  it('sums hours from jobs in the same department + week', () => {
    const jobs = [
      job({ id: 'a', shipWeek: 1, departmentHours: [{ departmentId: 'tables', hours: 40, workerIds: [] }] }),
      job({ id: 'b', shipWeek: 1, departmentHours: [{ departmentId: 'tables', hours: 30, workerIds: [] }] }),
    ];
    const grid = computeCapacityGrid(jobs, DEPARTMENTS);
    const cell = grid.find((c) => c.departmentId === 'tables' && c.week === 1)!;
    expect(cell.scheduledHours).toBe(70);
  });

  it('marks green when utilization < 85%', () => {
    const jobs = [
      job({ shipWeek: 1, departmentHours: [{ departmentId: 'tables', hours: 100, workerIds: [] }] }), // 100/200 = 50%
    ];
    const grid = computeCapacityGrid(jobs, DEPARTMENTS);
    const cell = grid.find((c) => c.departmentId === 'tables' && c.week === 1)!;
    expect(cell.status).toBe('green');
  });

  it('marks amber when utilization is 85–100%', () => {
    const jobs = [
      job({ shipWeek: 1, departmentHours: [{ departmentId: 'tables', hours: 180, workerIds: [] }] }), // 180/200 = 90%
    ];
    const grid = computeCapacityGrid(jobs, DEPARTMENTS);
    const cell = grid.find((c) => c.departmentId === 'tables' && c.week === 1)!;
    expect(cell.status).toBe('amber');
  });

  it('marks red when utilization > 100%', () => {
    const jobs = [
      job({ shipWeek: 1, departmentHours: [{ departmentId: 'tables', hours: 220, workerIds: [] }] }), // 220/200 = 110%
    ];
    const grid = computeCapacityGrid(jobs, DEPARTMENTS);
    const cell = grid.find((c) => c.departmentId === 'tables' && c.week === 1)!;
    expect(cell.status).toBe('red');
  });
});
```

- [ ] **Step 8.2: Run test — expect fail**

```bash
npm test
```

Expected: failures because `computeCapacityGrid` does not exist.

- [ ] **Step 8.3: Implement `src/lib/capacity-calc.ts`**

```ts
import type { Department, DeptWeekCapacity, Job, WeekIndex } from '@/types';

const WEEKS: WeekIndex[] = [1, 2, 3, 4];

export function computeCapacityGrid(
  jobs: Job[],
  departments: Department[],
): DeptWeekCapacity[] {
  const grid: DeptWeekCapacity[] = [];
  for (const dept of departments) {
    for (const week of WEEKS) {
      const scheduled = jobs
        .filter((j) => j.shipWeek === week)
        .flatMap((j) => j.departmentHours)
        .filter((dh) => dh.departmentId === dept.id)
        .reduce((sum, dh) => sum + dh.hours, 0);

      const capacity = dept.weeklyCapacityHours;
      const utilization = capacity === 0 ? 0 : scheduled / capacity;
      const status = utilization > 1 ? 'red' : utilization >= 0.85 ? 'amber' : 'green';

      grid.push({
        departmentId: dept.id,
        week,
        scheduledHours: scheduled,
        capacityHours: capacity,
        utilizationPercent: Math.round(utilization * 100),
        status,
      });
    }
  }
  return grid;
}
```

- [ ] **Step 8.4: Run test — expect pass**

```bash
npm test
```

Expected: all 5 tests pass.

- [ ] **Step 8.5: Commit**

```bash
git add src/lib/capacity-calc.ts src/lib/__tests__/capacity-calc.test.ts
git commit -m "feat(lib): capacity-calc with green/amber/red thresholds"
```

---

## Task 9: status-rules lib (TDD)

**Files:**
- Create: `src/lib/status-rules.ts`, `src/lib/__tests__/status-rules.test.ts`

This lib derives the row tint color from a job's state. Rules:
- `blocked` → red
- `in_engineering` → yellow
- `acknowledged` → gray
- `in_production` → green

- [ ] **Step 9.1: Write failing test**

`src/lib/__tests__/status-rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rowTintFromStatus } from '../status-rules';

describe('rowTintFromStatus', () => {
  it('returns red for blocked', () => {
    expect(rowTintFromStatus('blocked')).toBe('red');
  });
  it('returns yellow for in_engineering', () => {
    expect(rowTintFromStatus('in_engineering')).toBe('yellow');
  });
  it('returns gray for acknowledged', () => {
    expect(rowTintFromStatus('acknowledged')).toBe('gray');
  });
  it('returns green for in_production', () => {
    expect(rowTintFromStatus('in_production')).toBe('green');
  });
});
```

- [ ] **Step 9.2: Run test — expect fail**

```bash
npm test
```

- [ ] **Step 9.3: Implement `src/lib/status-rules.ts`**

```ts
import type { JobStatus } from '@/types';

export type RowTint = 'red' | 'yellow' | 'green' | 'gray';

export function rowTintFromStatus(status: JobStatus): RowTint {
  switch (status) {
    case 'blocked':        return 'red';
    case 'in_engineering': return 'yellow';
    case 'acknowledged':   return 'gray';
    case 'in_production':  return 'green';
  }
}

export const TINT_CLASSES: Record<RowTint, { row: string; dot: string; label: string }> = {
  red:    { row: 'bg-red-50 hover:bg-red-100',       dot: 'bg-red-500',    label: 'Blocked' },
  yellow: { row: 'bg-amber-50 hover:bg-amber-100',   dot: 'bg-amber-500',  label: 'In Engineering' },
  green:  { row: 'bg-emerald-50 hover:bg-emerald-100', dot: 'bg-emerald-500', label: 'In Production' },
  gray:   { row: 'bg-slate-50 hover:bg-slate-100',   dot: 'bg-slate-400',  label: 'Acknowledged' },
};
```

- [ ] **Step 9.4: Run test — expect pass**

```bash
npm test
```

- [ ] **Step 9.5: Commit**

```bash
git add src/lib/status-rules.ts src/lib/__tests__/status-rules.test.ts
git commit -m "feat(lib): status-rules row tint mapping"
```

---

## Task 10: drag-validation lib (TDD)

**Files:**
- Create: `src/lib/drag-validation.ts`, `src/lib/__tests__/drag-validation.test.ts`

This is the core of the "wow" interaction. Three rules to enforce:
1. **Hard date** — moving a job to a ship-week whose end date is *after* the customer's hard install date fails.
2. **Shortage** — moving a job to a ship-week whose *start* date is *before* the latest part ETA fails.
3. **Capacity** — moving a job that pushes any of its departments above 100% in the target week fails.

We'll use the fixed week boundaries from the spec (5/4–5/10, 5/11–5/17, 5/18–5/24, 5/25–5/31).

- [ ] **Step 10.1: Write failing test**

`src/lib/__tests__/drag-validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateMove } from '../drag-validation';
import { DEPARTMENTS } from '@/data/mock-departments';
import type { Job } from '@/types';

const baseJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'j_test',
  mfgNumber: '99999',
  customerId: 'c_test',
  contractTitle: 'Test Job',
  squareFootage: 100,
  shipDate: '2026-05-08',
  shipWeek: 1,
  status: 'acknowledged',
  shortages: [],
  departmentHours: [{ departmentId: 'tables', hours: 40, workerIds: [] }],
  auditLog: [],
  ...overrides,
});

describe('validateMove', () => {
  it('passes when no rules are broken', () => {
    const job = baseJob();
    const result = validateMove(job, 2, [job], DEPARTMENTS);
    expect(result.ok).toBe(true);
  });

  it('fails when target week ends after customer hard date', () => {
    const job = baseJob({
      hardCustomerDate: '2026-05-15',
      hardDateNote: 'Install booked',
    });
    // Week 3 ends 2026-05-24, which is after 2026-05-15
    const result = validateMove(job, 3, [job], DEPARTMENTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.some((f) => f.type === 'hard_date')).toBe(true);
    }
  });

  it('passes when target week ends on or before hard date', () => {
    const job = baseJob({ hardCustomerDate: '2026-05-17' });
    // Week 2 ends 2026-05-17 — should pass
    const result = validateMove(job, 2, [job], DEPARTMENTS);
    expect(result.ok).toBe(true);
  });

  it('fails when target week starts before shortage ETA', () => {
    const job = baseJob({
      shortages: [{ partName: 'X', vendor: 'Y', qty: 1, etaDate: '2026-05-20' }],
    });
    // Week 2 starts 2026-05-11 — before 2026-05-20
    const result = validateMove(job, 2, [job], DEPARTMENTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.some((f) => f.type === 'shortage')).toBe(true);
    }
  });

  it('passes when target week starts on or after latest shortage ETA', () => {
    const job = baseJob({
      shortages: [{ partName: 'X', vendor: 'Y', qty: 1, etaDate: '2026-05-18' }],
    });
    // Week 3 starts 2026-05-18 — should pass
    const result = validateMove(job, 3, [job], DEPARTMENTS);
    expect(result.ok).toBe(true);
  });

  it('fails when move pushes a department over 100% capacity', () => {
    const moving = baseJob({
      id: 'j_move',
      shipWeek: 1,
      departmentHours: [{ departmentId: 'tables', hours: 80, workerIds: [] }],
    });
    const existing = baseJob({
      id: 'j_existing',
      shipWeek: 2,
      departmentHours: [{ departmentId: 'tables', hours: 180, workerIds: [] }], // already 90%
    });
    // tables capacity = 200; existing 180 + moving 80 = 260 = 130% in week 2
    const result = validateMove(moving, 2, [moving, existing], DEPARTMENTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.some((f) => f.type === 'capacity')).toBe(true);
    }
  });

  it('returns multiple failure reasons when several rules break', () => {
    const job = baseJob({
      hardCustomerDate: '2026-05-10',
      shortages: [{ partName: 'X', vendor: 'Y', qty: 1, etaDate: '2026-05-30' }],
    });
    const result = validateMove(job, 4, [job], DEPARTMENTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failures.length).toBeGreaterThanOrEqual(2);
    }
  });
});
```

- [ ] **Step 10.2: Run test — expect fail**

```bash
npm test
```

- [ ] **Step 10.3: Implement `src/lib/drag-validation.ts`**

```ts
import type {
  Department,
  DragValidationFailure,
  DragValidationResult,
  Job,
  WeekIndex,
} from '@/types';

const WEEK_BOUNDS: Record<WeekIndex, { start: string; end: string }> = {
  1: { start: '2026-05-04', end: '2026-05-10' },
  2: { start: '2026-05-11', end: '2026-05-17' },
  3: { start: '2026-05-18', end: '2026-05-24' },
  4: { start: '2026-05-25', end: '2026-05-31' },
};

export function validateMove(
  movingJob: Job,
  targetWeek: WeekIndex,
  allJobs: Job[],
  departments: Department[],
): DragValidationResult {
  const failures: DragValidationFailure[] = [];
  const bounds = WEEK_BOUNDS[targetWeek];

  // Rule 1: hard date
  if (movingJob.hardCustomerDate && bounds.end > movingJob.hardCustomerDate) {
    failures.push({
      type: 'hard_date',
      message: `Customer hard date is ${movingJob.hardCustomerDate}; Week ${targetWeek} ends ${bounds.end}.`,
      details: movingJob.hardDateNote,
    });
  }

  // Rule 2: shortage
  if (movingJob.shortages.length > 0) {
    const latestEta = movingJob.shortages
      .map((s) => s.etaDate)
      .sort()
      .at(-1)!;
    if (bounds.start < latestEta) {
      failures.push({
        type: 'shortage',
        message: `Latest part ETA is ${latestEta}; Week ${targetWeek} starts ${bounds.start}.`,
        details: `${movingJob.shortages.length} part(s) outstanding`,
      });
    }
  }

  // Rule 3: capacity
  const otherJobsInTargetWeek = allJobs.filter(
    (j) => j.id !== movingJob.id && j.shipWeek === targetWeek,
  );
  for (const dh of movingJob.departmentHours) {
    const dept = departments.find((d) => d.id === dh.departmentId);
    if (!dept || dept.weeklyCapacityHours === 0) continue;
    const existingHours = otherJobsInTargetWeek
      .flatMap((j) => j.departmentHours)
      .filter((other) => other.departmentId === dh.departmentId)
      .reduce((sum, other) => sum + other.hours, 0);
    const totalAfterMove = existingHours + dh.hours;
    if (totalAfterMove > dept.weeklyCapacityHours) {
      failures.push({
        type: 'capacity',
        message: `${dept.name} would be at ${Math.round((totalAfterMove / dept.weeklyCapacityHours) * 100)}% in Week ${targetWeek} (${totalAfterMove}/${dept.weeklyCapacityHours} hrs).`,
      });
    }
  }

  return failures.length === 0 ? { ok: true } : { ok: false, failures };
}
```

- [ ] **Step 10.4: Run test — expect pass**

```bash
npm test
```

Expected: all 7 tests pass.

- [ ] **Step 10.5: Commit**

```bash
git add src/lib/drag-validation.ts src/lib/__tests__/drag-validation.test.ts
git commit -m "feat(lib): drag-validation enforces hard-date / shortage / capacity rules"
```

---

## Task 11: StatusFlag component

**Files:**
- Create: `src/components/cws/StatusFlag.tsx`

- [ ] **Step 11.1: Write `src/components/cws/StatusFlag.tsx`**

```tsx
import { TINT_CLASSES, rowTintFromStatus } from '@/lib/status-rules';
import type { JobStatus } from '@/types';
import { cn } from '@/lib/utils';

export function StatusFlag({ status, className }: { status: JobStatus; className?: string }) {
  const tint = rowTintFromStatus(status);
  const { dot, label } = TINT_CLASSES[tint];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs', className)}>
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
      <span className="text-slate-600">{label}</span>
    </span>
  );
}
```

- [ ] **Step 11.2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 11.3: Commit**

```bash
git add src/components/cws/StatusFlag.tsx
git commit -m "feat(cws): StatusFlag component"
```

---

## Task 12: CapacityStrip component

**Files:**
- Create: `src/components/cws/CapacityStrip.tsx`

- [ ] **Step 12.1: Write `src/components/cws/CapacityStrip.tsx`**

```tsx
import { cn } from '@/lib/utils';
import type { Department, DeptWeekCapacity, WeekIndex } from '@/types';

const WEEK_LABELS: Record<WeekIndex, string> = {
  1: 'Wk 1 · 5/4',
  2: 'Wk 2 · 5/11',
  3: 'Wk 3 · 5/18',
  4: 'Wk 4 · 5/25',
};

const STATUS_BG: Record<DeptWeekCapacity['status'], string> = {
  green: 'bg-emerald-100 text-emerald-900',
  amber: 'bg-amber-200 text-amber-900',
  red:   'bg-red-300 text-red-950',
};

export function CapacityStrip({
  grid,
  departments,
}: {
  grid: DeptWeekCapacity[];
  departments: Department[];
}) {
  const cell = (deptId: string, week: WeekIndex) =>
    grid.find((c) => c.departmentId === deptId && c.week === week);

  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="px-6 py-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Department Capacity — Rolling 4 Weeks
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs font-tabular-nums">
            <thead>
              <tr className="text-slate-500">
                <th className="w-40 px-2 py-1 text-left font-medium">Department</th>
                {([1, 2, 3, 4] as WeekIndex[]).map((w) => (
                  <th key={w} className="px-2 py-1 text-left font-medium">{WEEK_LABELS[w]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} className="border-t border-slate-100">
                  <td className="px-2 py-1 text-slate-700">{dept.name}</td>
                  {([1, 2, 3, 4] as WeekIndex[]).map((w) => {
                    const c = cell(dept.id, w);
                    if (!c) return <td key={w} />;
                    return (
                      <td key={w} className="px-2 py-1">
                        <span
                          className={cn('inline-block rounded px-2 py-0.5 font-medium', STATUS_BG[c.status])}
                          title={`${c.scheduledHours} of ${c.capacityHours} hrs (${c.utilizationPercent}%)`}
                        >
                          {c.scheduledHours} / {c.capacityHours}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 12.2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 12.3: Commit**

```bash
git add src/components/cws/CapacityStrip.tsx
git commit -m "feat(cws): CapacityStrip — 12 depts × 4 weeks heatmap"
```

---

## Task 13: SequenceRow + WeekGroupHeader + WeekTotalsRow

**Files:**
- Create: `src/components/cws/SequenceRow.tsx`, `src/components/cws/WeekGroupHeader.tsx`, `src/components/cws/WeekTotalsRow.tsx`

- [ ] **Step 13.1: Write `src/components/cws/WeekGroupHeader.tsx`**

```tsx
import type { WeekIndex } from '@/types';

const WEEK_RANGES: Record<WeekIndex, string> = {
  1: 'Week 1 · May 4 – May 10',
  2: 'Week 2 · May 11 – May 17',
  3: 'Week 3 · May 18 – May 24',
  4: 'Week 4 · May 25 – May 31',
};

export function WeekGroupHeader({ week }: { week: WeekIndex }) {
  return (
    <tr className="border-y border-slate-300 bg-slate-100">
      <td colSpan={99} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
        {WEEK_RANGES[week]}
      </td>
    </tr>
  );
}
```

- [ ] **Step 13.2: Write `src/components/cws/WeekTotalsRow.tsx`**

```tsx
import { cn } from '@/lib/utils';
import type { Department, DeptWeekCapacity, WeekIndex } from '@/types';

const STATUS_TEXT: Record<DeptWeekCapacity['status'], string> = {
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  red:   'text-red-700 font-bold',
};

export function WeekTotalsRow({
  week,
  departments,
  grid,
}: {
  week: WeekIndex;
  departments: Department[];
  grid: DeptWeekCapacity[];
}) {
  const cellFor = (deptId: string) => grid.find((c) => c.departmentId === deptId && c.week === week);
  return (
    <tr className="border-t border-slate-200 bg-slate-50 text-xs font-tabular-nums">
      <td className="px-2 py-1 text-slate-500" colSpan={5}>
        Week {week} totals →
      </td>
      {departments.map((d) => {
        const c = cellFor(d.id);
        return (
          <td key={d.id} className={cn('px-2 py-1 text-right', c && STATUS_TEXT[c.status])}>
            {c ? `${c.scheduledHours}/${c.capacityHours}` : ''}
          </td>
        );
      })}
    </tr>
  );
}
```

- [ ] **Step 13.3: Write `src/components/cws/SequenceRow.tsx`**

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TINT_CLASSES, rowTintFromStatus } from '@/lib/status-rules';
import type { Customer, Department, Job } from '@/types';

export function SequenceRow({
  job,
  customers,
  departments,
  onClick,
}: {
  job: Job;
  customers: Customer[];
  departments: Department[];
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const tint = rowTintFromStatus(job.status);
  const customer = customers.find((c) => c.id === job.customerId);
  const hoursFor = (deptId: string) =>
    job.departmentHours.find((dh) => dh.departmentId === deptId)?.hours ?? 0;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cn(
        'cursor-pointer border-t border-slate-200 text-xs font-tabular-nums',
        TINT_CLASSES[tint].row,
      )}
    >
      <td className="w-8 px-1 py-1.5">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-2 w-2 rounded-full', TINT_CLASSES[tint].dot)} aria-hidden />
          {job.hardCustomerDate && <AlertTriangle className="h-3 w-3 text-red-600" />}
        </div>
      </td>
      <td className="px-2 py-1.5 font-mono text-slate-700">{job.mfgNumber}</td>
      <td className="px-2 py-1.5 text-slate-900">
        <div className="font-medium">{customer?.name ?? '—'}</div>
        <div className="text-[11px] text-slate-500">{job.contractTitle}</div>
      </td>
      <td className="px-2 py-1.5 text-slate-700">{job.shipDate}</td>
      <td className="px-2 py-1.5 text-right text-slate-700">
        {job.squareFootage > 0 ? job.squareFootage : '—'}
      </td>
      {departments.map((d) => {
        const h = hoursFor(d.id);
        return (
          <td key={d.id} className={cn('px-2 py-1.5 text-right', h === 0 ? 'text-slate-300' : 'text-slate-800')}>
            {h === 0 ? '·' : h}
          </td>
        );
      })}
    </tr>
  );
}
```

- [ ] **Step 13.4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 13.5: Commit**

```bash
git add src/components/cws/WeekGroupHeader.tsx src/components/cws/WeekTotalsRow.tsx src/components/cws/SequenceRow.tsx
git commit -m "feat(cws): SequenceRow + week group + totals row"
```

---

## Task 14: SequenceTable composition

**Files:**
- Create: `src/components/cws/SequenceTable.tsx`

- [ ] **Step 14.1: Write `src/components/cws/SequenceTable.tsx`**

```tsx
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { SequenceRow } from './SequenceRow';
import { WeekGroupHeader } from './WeekGroupHeader';
import { WeekTotalsRow } from './WeekTotalsRow';
import type { Customer, Department, DeptWeekCapacity, Job, WeekIndex } from '@/types';

const WEEKS: WeekIndex[] = [1, 2, 3, 4];

export function SequenceTable({
  jobs,
  customers,
  departments,
  capacityGrid,
  onRowClick,
  onDragEnd,
}: {
  jobs: Job[];
  customers: Customer[];
  departments: Department[];
  capacityGrid: DeptWeekCapacity[];
  onRowClick: (job: Job) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="overflow-x-auto bg-white">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="w-8 px-1 py-2" />
              <th className="px-2 py-2 text-left">Status</th>
              <th className="px-2 py-2 text-left">MFG #</th>
              <th className="px-2 py-2 text-left">Customer / Job</th>
              <th className="px-2 py-2 text-left">Ship Date</th>
              <th className="px-2 py-2 text-right">Sq Ft</th>
              {departments.map((d) => (
                <th key={d.id} className="px-2 py-2 text-right" title={d.name}>
                  {d.name.split(' ')[0]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKS.map((week) => {
              const weekJobs = jobs.filter((j) => j.shipWeek === week);
              return (
                <SortableContext key={week} items={weekJobs.map((j) => j.id)}>
                  <WeekGroupHeader week={week} />
                  {weekJobs.map((job) => (
                    <SequenceRow
                      key={job.id}
                      job={job}
                      customers={customers}
                      departments={departments}
                      onClick={() => onRowClick(job)}
                    />
                  ))}
                  <WeekTotalsRow week={week} departments={departments} grid={capacityGrid} />
                </SortableContext>
              );
            })}
          </tbody>
        </table>
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 14.2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 14.3: Commit**

```bash
git add src/components/cws/SequenceTable.tsx
git commit -m "feat(cws): SequenceTable with dnd-kit drag handling"
```

---

## Task 15: Job drawer sub-components

**Files:**
- Create: `src/components/cws/StatusTimeline.tsx`, `src/components/cws/ShortageList.tsx`, `src/components/cws/LoriNoteBanner.tsx`, `src/components/cws/DepartmentHoursList.tsx`

- [ ] **Step 15.1: Write `src/components/cws/StatusTimeline.tsx`**

```tsx
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Job } from '@/types';

const STEPS = [
  { key: 'drawingsApprovedDate', label: 'Drawings Approved' },
  { key: 'bomCompleteDate',      label: 'BOM Complete' },
  { key: 'vendorAckDate',        label: 'Vendor Ack' },
] as const;

export function StatusTimeline({ job }: { job: Job }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((step) => {
        const date = job[step.key];
        const done = !!date;
        return (
          <li
            key={step.key}
            className={cn(
              'flex items-center gap-1.5 rounded px-2 py-1',
              done ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500',
            )}
          >
            {done ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
            <span className="font-medium">{step.label}</span>
            {done && <span className="font-tabular-nums text-slate-500">{date}</span>}
          </li>
        );
      })}
      {job.bomCompletionPercent !== undefined && job.bomCompletionPercent < 100 && (
        <li className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
          BOM {job.bomCompletionPercent}%
        </li>
      )}
    </ol>
  );
}
```

- [ ] **Step 15.2: Write `src/components/cws/ShortageList.tsx`**

```tsx
import type { ShortagePart } from '@/types';

export function ShortageList({ shortages }: { shortages: ShortagePart[] }) {
  if (shortages.length === 0) {
    return <p className="text-xs text-slate-500">No outstanding parts.</p>;
  }
  return (
    <table className="w-full text-xs font-tabular-nums">
      <thead className="text-slate-500">
        <tr>
          <th className="py-1 text-left font-medium">Part</th>
          <th className="py-1 text-left font-medium">Vendor</th>
          <th className="py-1 text-right font-medium">Qty</th>
          <th className="py-1 text-right font-medium">ETA</th>
        </tr>
      </thead>
      <tbody>
        {shortages.map((s, i) => (
          <tr key={i} className="border-t border-slate-100">
            <td className="py-1 text-slate-800">{s.partName}</td>
            <td className="py-1 text-slate-600">{s.vendor}</td>
            <td className="py-1 text-right text-slate-800">{s.qty}</td>
            <td className="py-1 text-right font-medium text-red-700">{s.etaDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 15.3: Write `src/components/cws/LoriNoteBanner.tsx`**

```tsx
import { CalendarClock } from 'lucide-react';
import type { Job } from '@/types';

export function LoriNoteBanner({ job }: { job: Job }) {
  if (!job.hardCustomerDate && !job.loriNote) return null;
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3">
      {job.hardCustomerDate && (
        <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
          <CalendarClock className="h-4 w-4" />
          Hard customer date: {job.hardCustomerDate}
        </div>
      )}
      {job.hardDateNote && <p className="mt-1 text-xs text-red-800">{job.hardDateNote}</p>}
      {job.loriNote && <p className="mt-2 text-xs text-red-900">{job.loriNote}</p>}
    </div>
  );
}
```

- [ ] **Step 15.4: Write `src/components/cws/DepartmentHoursList.tsx`**

```tsx
import type { Department, DepartmentHours, Worker } from '@/types';

export function DepartmentHoursList({
  hours,
  departments,
  workers,
}: {
  hours: DepartmentHours[];
  departments: Department[];
  workers: Worker[];
}) {
  if (hours.length === 0) {
    return <p className="text-xs text-slate-500">No department hours assigned.</p>;
  }
  const totalHours = hours.reduce((sum, h) => sum + h.hours, 0);
  return (
    <div>
      <ul className="divide-y divide-slate-100 text-xs font-tabular-nums">
        {hours.map((h) => {
          const dept = departments.find((d) => d.id === h.departmentId);
          const names = h.workerIds
            .map((id) => workers.find((w) => w.id === id)?.name)
            .filter(Boolean)
            .join(', ');
          return (
            <li key={h.departmentId} className="flex items-center justify-between py-1.5">
              <div>
                <div className="font-medium text-slate-800">{dept?.name ?? h.departmentId}</div>
                {names && <div className="text-[11px] text-slate-500">{names}</div>}
              </div>
              <div className="font-semibold text-slate-900">{h.hours}h</div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-xs font-semibold text-slate-700">
        <span>Total</span>
        <span className="font-tabular-nums">{totalHours}h</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 15.5: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 15.6: Commit**

```bash
git add src/components/cws/StatusTimeline.tsx src/components/cws/ShortageList.tsx src/components/cws/LoriNoteBanner.tsx src/components/cws/DepartmentHoursList.tsx
git commit -m "feat(cws): drawer sub-components — timeline, shortage, lori note, dept hours"
```

---

## Task 16: JobDrawer composition

**Files:**
- Create: `src/components/cws/JobDrawer.tsx`

- [ ] **Step 16.1: Write `src/components/cws/JobDrawer.tsx`**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusFlag } from './StatusFlag';
import { StatusTimeline } from './StatusTimeline';
import { ShortageList } from './ShortageList';
import { LoriNoteBanner } from './LoriNoteBanner';
import { DepartmentHoursList } from './DepartmentHoursList';
import type { Customer, Department, Job, Worker } from '@/types';

export function JobDrawer({
  job,
  customers,
  departments,
  workers,
  open,
  onOpenChange,
}: {
  job: Job | null;
  customers: Customer[];
  departments: Department[];
  workers: Worker[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!job) return null;
  const customer = customers.find((c) => c.id === job.customerId);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] overflow-y-auto sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle className="text-base">
            <div className="flex items-center gap-3">
              <span className="font-mono text-slate-700">#{job.mfgNumber}</span>
              <StatusFlag status={job.status} />
            </div>
            <div className="mt-1 text-sm font-medium text-slate-900">{customer?.name}</div>
            <div className="text-xs font-normal text-slate-500">{job.contractTitle}</div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
            <div>Ship date <span className="ml-1 font-tabular-nums text-slate-900">{job.shipDate}</span></div>
            <div>Sq ft <span className="ml-1 font-tabular-nums text-slate-900">{job.squareFootage || '—'}</span></div>
          </div>

          <LoriNoteBanner job={job} />

          <Section title="Status">
            <StatusTimeline job={job} />
          </Section>

          <Section title="Engineering">
            <p className="text-xs text-slate-700">
              {job.drafterId
                ? `Drafter: ${job.drafterId.replace('w_', '')}, ${job.drawingRev ?? ''} · BOM ${job.bomCompletionPercent ?? 0}%`
                : 'Drawings approved · BOM complete'}
            </p>
          </Section>

          <Section title="Shortages">
            <ShortageList shortages={job.shortages} />
          </Section>

          <Section title="Department Hours">
            <DepartmentHoursList hours={job.departmentHours} departments={departments} workers={workers} />
          </Section>

          <Section title="Audit log">
            {job.auditLog.length === 0 ? (
              <p className="text-xs text-slate-500">No entries.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {job.auditLog.map((e, i) => (
                  <li key={i} className="text-slate-700">
                    <span className="font-mono text-slate-500">{e.date}</span>{' '}
                    <span className="font-medium">{e.user}</span>: {e.action}
                    {e.reason && <span className="text-slate-500"> — {e.reason}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
  );
}
```

- [ ] **Step 16.2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 16.3: Commit**

```bash
git add src/components/cws/JobDrawer.tsx
git commit -m "feat(cws): JobDrawer assembling all sub-sections"
```

---

## Task 17: DragWarningModal

**Files:**
- Create: `src/components/cws/DragWarningModal.tsx`

- [ ] **Step 17.1: Write `src/components/cws/DragWarningModal.tsx`**

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import type { DragValidationFailure } from '@/types';

const FAIL_LABEL: Record<DragValidationFailure['type'], string> = {
  hard_date: 'Customer hard date',
  shortage: 'Material shortage',
  capacity: 'Department capacity',
};

export function DragWarningModal({
  open,
  failures,
  onCancel,
  onOverride,
}: {
  open: boolean;
  failures: DragValidationFailure[];
  onCancel: () => void;
  onOverride: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const handleOverride = () => {
    if (!reason.trim()) return;
    onOverride(reason);
    setReason('');
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            This move breaks {failures.length} rule{failures.length === 1 ? '' : 's'}
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-3 text-sm">
          {failures.map((f, i) => (
            <li key={i} className="rounded border border-red-200 bg-red-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
                {FAIL_LABEL[f.type]}
              </div>
              <div className="mt-1 text-slate-900">{f.message}</div>
              {f.details && <div className="mt-1 text-xs text-slate-600">{f.details}</div>}
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <label className="text-xs font-medium text-slate-700">Override reason (required)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
            rows={2}
            placeholder="e.g. Customer agreed to push install by 2 days"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel move</Button>
          <Button variant="destructive" onClick={handleOverride} disabled={!reason.trim()}>
            Override anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 17.2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 17.3: Commit**

```bash
git add src/components/cws/DragWarningModal.tsx
git commit -m "feat(cws): DragWarningModal with override reason"
```

---

## Task 18: App.tsx — wire it all together

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 18.1: Replace `src/App.tsx`**

```tsx
import { useMemo, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { CapacityStrip } from '@/components/cws/CapacityStrip';
import { SequenceTable } from '@/components/cws/SequenceTable';
import { JobDrawer } from '@/components/cws/JobDrawer';
import { DragWarningModal } from '@/components/cws/DragWarningModal';
import { computeCapacityGrid } from '@/lib/capacity-calc';
import { validateMove } from '@/lib/drag-validation';
import { DEPARTMENTS } from '@/data/mock-departments';
import { WORKERS } from '@/data/mock-workers';
import { CUSTOMERS } from '@/data/mock-customers';
import { JOBS } from '@/data/mock-jobs';
import type { DragValidationFailure, Job, WeekIndex } from '@/types';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>(JOBS);
  const [openJob, setOpenJob] = useState<Job | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    jobId: string;
    targetWeek: WeekIndex;
    failures: DragValidationFailure[];
  } | null>(null);

  const capacityGrid = useMemo(
    () => computeCapacityGrid(jobs, DEPARTMENTS),
    [jobs],
  );

  const applyMove = (jobId: string, targetWeek: WeekIndex, overrideReason?: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              shipWeek: targetWeek,
              auditLog: [
                ...j.auditLog,
                {
                  date: new Date().toISOString().slice(0, 10),
                  user: 'Anne',
                  action: `Moved to Week ${targetWeek}`,
                  reason: overrideReason,
                },
              ],
            }
          : j,
      ),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const movingJob = jobs.find((j) => j.id === active.id);
    const targetJob = jobs.find((j) => j.id === over.id);
    if (!movingJob || !targetJob) return;
    if (movingJob.shipWeek === targetJob.shipWeek) return; // re-ordering within same week → no-op for demo

    const targetWeek = targetJob.shipWeek;
    const result = validateMove(movingJob, targetWeek, jobs, DEPARTMENTS);
    if (result.ok) {
      applyMove(movingJob.id, targetWeek);
    } else {
      setPendingMove({ jobId: movingJob.id, targetWeek, failures: result.failures });
    }
  };

  const handleRowClick = (job: Job) => {
    setOpenJob(job);
    setDrawerOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex items-baseline justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight">ShopFlow</h1>
          <p className="text-xs text-slate-500">
            Current Work Sequence — Rolling 4 Weeks · Week of May 4, 2026
          </p>
        </div>
        <div className="text-xs text-slate-500">Last updated · today 6:42 AM</div>
      </header>

      <CapacityStrip grid={capacityGrid} departments={DEPARTMENTS} />

      <main className="flex-1 overflow-hidden">
        <SequenceTable
          jobs={jobs}
          customers={CUSTOMERS}
          departments={DEPARTMENTS}
          capacityGrid={capacityGrid}
          onRowClick={handleRowClick}
          onDragEnd={handleDragEnd}
        />
      </main>

      <JobDrawer
        job={openJob}
        customers={CUSTOMERS}
        departments={DEPARTMENTS}
        workers={WORKERS}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <DragWarningModal
        open={pendingMove !== null}
        failures={pendingMove?.failures ?? []}
        onCancel={() => setPendingMove(null)}
        onOverride={(reason) => {
          if (pendingMove) {
            applyMove(pendingMove.jobId, pendingMove.targetWeek, reason);
            setPendingMove(null);
          }
        }}
      />
    </div>
  );
}
```

- [ ] **Step 18.2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 18.3: Build**

```bash
npm run build
```

Expected: clean.

- [ ] **Step 18.4: Run dev server and smoke-check**

```bash
npm run dev
```

Open the local URL. Verify visually:
- Header renders
- CapacityStrip shows 12 dept rows × 4 week cols with at least one amber and one red cell
- SequenceTable shows 4 week groups with jobs inside, color-tinted rows, totals row at bottom of each week
- Click a row → drawer opens on the right with the job detail
- Drag a row to a different week → either applies cleanly or opens the warning modal

Stop the dev server.

- [ ] **Step 18.5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire CWS — capacity strip, table, drawer, drag flow"
```

---

## Task 19: Final walkthrough QA

**Files:** none — verification only.

This task validates every requirement in the spec against the running app.

- [ ] **Step 19.1: Run typecheck and build**

```bash
npx tsc --noEmit
npm run build
```

Expected: both clean.

- [ ] **Step 19.2: Run all tests**

```bash
npm test
```

Expected: 16 tests pass across 3 files.

- [ ] **Step 19.3: Run dev server and execute the walkthrough script**

```bash
npm run dev
```

Walk through each beat from the spec. Each must pass; if any fails, stop and fix:

1. **Open the page.** Anne's view is default. Capacity strip shows two amber/red dept-weeks. ✅
2. **Hover a red capacity cell.** Tooltip shows hours / capacity / utilization. ✅
3. **Click a healthy green row.** Drawer slides open. Walk through the timeline, shortage list (empty), Lori note (none), dept-hour breakdown. ✅
4. **Close drawer. Click a yellow row** (e.g. j_36302 Oakwood). Drawer shows engineering still in progress, BOM partial. ✅
5. **Click a red row** (j_36284 Acme HQ). Drawer pinned banner shows "Hard customer date: 2026-05-28". ✅
6. **Drag j_36284 to Week 3 or later** → modal blocks: hard-date violation listed. ✅
7. **Cancel the move. Drag a healthy job** (e.g. j_36298 Lex Capital) **to Week 4** → succeeds, capacity totals recompute. ✅
8. **(Optional)** Drag j_36284 again, type an override reason, click Override anyway → move applies, audit log on the row drawer shows the override entry.

Stop the dev server.

- [ ] **Step 19.4: Commit any cleanup if needed**

If any walkthrough beat required a fix, commit it now with a descriptive message. Otherwise, no commit.

```bash
git status
```

If clean, proceed.

- [ ] **Step 19.5: Final commit — mark demo complete**

```bash
git commit --allow-empty -m "demo: ShopFlow CWS demo complete — all walkthrough beats pass"
```

---

## Self-Review Notes

Done after writing. Verified:

- **Spec coverage:** Each section in the spec maps to at least one task — header (T18), capacity strip (T8 + T12), sequence table (T13 + T14), job drawer (T15 + T16), drag interaction (T10 + T17 + T18), mock data with story coverage (T6 + T7), file structure matches spec, walkthrough QA covered (T19).
- **No placeholders:** Each step has runnable commands or complete code.
- **Type consistency:** All types defined in `src/types.ts` (T5); later tasks import from `@/types` without redefining.
- **TDD applied** to the three pure-logic libs where the rules matter (capacity, status, drag validation). UI components are integration-tested via the final walkthrough — appropriate scope for a demo.
