# Investment Memo Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Generate Investment Memo" feature that takes a completed ResearchBrief and produces a formatted VC-style investment memo via a dedicated Claude API call.

**Architecture:** New `/api/memo` POST endpoint calls Anthropic directly (no jam-nodes) with the brief data and an investment memo prompt. Frontend adds a 4th page state (`memo`) — after brief is shown, user clicks CTA, a fullscreen overlay shows "Drafting memo...", then `InvestmentMemo` component renders the result. Errors during memo generation keep the brief visible (state stays `done`).

**Tech Stack:** Next.js 16 App Router, TypeScript 5, Tailwind 4, Anthropic Messages API (claude-sonnet-4-20250514), React 19

---

## Chunk 1: Types + API Route

### Task 1: Add MemoResponse type

**Files:**
- Modify: `glasswing-research/src/lib/types.ts`

- [ ] **Step 1: Add MemoResponse interface at end of types.ts**

```typescript
export interface MemoResponse {
  success: boolean;
  memo?: string;
  error?: string;
}
```

- [ ] **Step 2: Verify TypeScript still compiles**

Run: `cd glasswing-research && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add glasswing-research/src/lib/types.ts
git commit -m "feat: add MemoResponse type"
```

---

### Task 2: Create /api/memo route

**Files:**
- Create: `glasswing-research/src/app/api/memo/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { MemoResponse, ResearchBrief } from '@/lib/types';

const requestSchema = z.object({
  brief: z.object({}).passthrough(),
});

export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse<MemoResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Missing brief in request body' }, { status: 400 });
  }

  const brief = parsed.data.brief as ResearchBrief;
  const companyName = brief.companyName ?? 'the company';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const userContent = `Write an investment memo for ${companyName} based on this research data: ${JSON.stringify(brief)}.

Format the memo with these sections:
1. EXECUTIVE SUMMARY (2-3 sentences — what they do and why it matters)
2. COMPANY OVERVIEW (product, market, business model)
3. TEAM (who's running it, notable backgrounds)
4. MARKET OPPORTUNITY (TAM, growth drivers, timing)
5. COMPETITIVE LANDSCAPE (who else, moat analysis)
6. TRACTION & METRICS (funding, revenue, employees, growth signals)
7. KEY RISKS (red flags, concerns, open questions)
8. GLASSWING FIT (thesis alignment, value-add opportunities, network leverage)
9. RECOMMENDATION (proceed to partner meeting / pass / needs more diligence)

Be honest and data-driven. If data is missing, call it out as an open question that needs follow-up.`;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system:
          'You are a senior associate at Glasswing Ventures writing an internal investment memo. Glasswing invests in AI/ML enterprise startups. Write in a professional but concise VC style. Use specific data points from the research. The memo should be something a partner could read before an investment committee meeting.',
        messages: [{ role: 'user', content: userContent }],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error calling Anthropic API';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return NextResponse.json(
      { success: false, error: `Anthropic API error ${response.status}: ${text}` },
      { status: 502 }
    );
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const memo = data.content?.find((c) => c.type === 'text')?.text ?? '';

  if (!memo) {
    return NextResponse.json({ success: false, error: 'Empty response from Anthropic' }, { status: 502 });
  }

  return NextResponse.json({ success: true, memo });
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd glasswing-research && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add glasswing-research/src/app/api/memo/route.ts
git commit -m "feat: add POST /api/memo route for investment memo generation"
```

---

## Chunk 2: UI Components

### Task 3: Create InvestmentMemo component

**Files:**
- Create: `glasswing-research/src/components/InvestmentMemo.tsx`

The component receives `memo: string` (raw text from Claude) and `onBack: () => void`. It renders:
- Top bar: "← Back to Brief" button (left) + "Copy to Clipboard" button (right)
- Memo body: parse lines to detect section headers and render them in JetBrains Mono; body text in IBM Plex Sans. Dark terminal aesthetic matching the rest of the app.

**Note on section header detection:** Claude may return headers in several formats — `1. EXECUTIVE SUMMARY`, `**EXECUTIVE SUMMARY**`, or `EXECUTIVE SUMMARY:`. The regex strips markdown bold markers and trailing colons/punctuation before matching.

- [ ] **Step 1: Create the component**

```typescript
'use client';

import { useState } from 'react';

interface InvestmentMemoProps {
  memo: string;
  onBack: () => void;
}

export default function InvestmentMemo({ memo, onBack }: InvestmentMemoProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(memo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = memo.split('\n');

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-16">
      {/* Top bar */}
      <div
        className="flex items-center justify-between py-4 mb-6"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
        >
          ← Back to Brief
        </button>
        <button
          onClick={handleCopy}
          className="text-sm px-3 py-1.5 rounded transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-jetbrains)',
          }}
        >
          {copied ? '✓ Copied' : 'Copy to Clipboard'}
        </button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <p
          className="text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}
        >
          Investment Memo · Glasswing Ventures
        </p>
        <h1
          className="text-2xl font-medium mb-1"
          style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--text-primary)' }}
        >
          Internal Deal Memo
        </h1>
        <p
          className="text-xs"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
        >
          First draft ·{' '}
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Memo body */}
      <div className="flex flex-col gap-1">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={i} className="h-3" />;
          }

          // Strip markdown bold markers and trailing punctuation to normalize for header detection
          const normalized = trimmed
            .replace(/^\*\*|\*\*$/g, '')   // remove leading/trailing **
            .replace(/[:\s]+$/, '')          // remove trailing colon or whitespace
            .trim();

          // Section headers: "1. EXECUTIVE SUMMARY" or bare "EXECUTIVE SUMMARY"
          const isSectionHeader =
            /^\d+\.\s+[A-Z][A-Z\s&]+$/.test(normalized) ||
            /^[A-Z][A-Z\s&]{4,}$/.test(normalized);

          if (isSectionHeader) {
            return (
              <div key={i} className="pt-6 pb-1">
                <h2
                  className="text-xs font-bold uppercase tracking-widest pb-2"
                  style={{
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-jetbrains)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {normalized.replace(/^\d+\.\s+/, '')}
                </h2>
              </div>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            return (
              <p
                key={i}
                className="text-sm leading-relaxed pl-4"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
              >
                {trimmed}
              </p>
            );
          }

          // Regular body text
          return (
            <p
              key={i}
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd glasswing-research && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add glasswing-research/src/components/InvestmentMemo.tsx
git commit -m "feat: add InvestmentMemo component with copy-to-clipboard"
```

---

### Task 4: Add "Generate Investment Memo" button to ResearchBrief

**Files:**
- Modify: `glasswing-research/src/components/ResearchBrief.tsx`

The current file (line 4) has `interface Props { brief: ResearchBriefType; }` and `export default function ResearchBrief({ brief }: Props)`. The CTA button goes between the closing `</div>` of the last section content (line 259 — end of the chatgpt/perplexity details block) and the footer `<p>` (line 262).

- [ ] **Step 1: Add onGenerateMemo to the Props interface (line 4–6)**

Change:
```typescript
interface Props {
  brief: ResearchBriefType;
}
```
To:
```typescript
interface Props {
  brief: ResearchBriefType;
  onGenerateMemo: () => void;
}
```

- [ ] **Step 2: Destructure onGenerateMemo in the function signature (line 8)**

Change:
```typescript
export default function ResearchBrief({ brief }: Props) {
```
To:
```typescript
export default function ResearchBrief({ brief, onGenerateMemo }: Props) {
```

- [ ] **Step 3: Insert CTA button between last section and footer**

The footer `<p>` starts at line 262 with:
```tsx
      {/* Footer */}
      <p
```

Insert the following block immediately before that footer comment:
```tsx
      {/* Investment Memo CTA */}
      <div className="mt-8 mb-2">
        <button
          onClick={onGenerateMemo}
          className="w-full py-3 px-6 text-white font-bold uppercase tracking-widest rounded transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            background: 'var(--accent)',
            fontFamily: 'var(--font-jetbrains)',
            fontSize: '0.8rem',
          }}
        >
          Generate Investment Memo →
        </button>
        <p
          className="text-center text-xs mt-2"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
        >
          First-draft VC memo · powered by Claude
        </p>
      </div>

```

- [ ] **Step 4: Verify TypeScript**

Run: `cd glasswing-research && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add glasswing-research/src/components/ResearchBrief.tsx
git commit -m "feat: add Generate Investment Memo CTA to ResearchBrief"
```

---

## Chunk 3: Page State Machine

### Task 5: Wire up page.tsx with memo state

**Files:**
- Modify: `glasswing-research/src/app/page.tsx`

The current file structure (as of last read):
- Line 9: `type PageState = 'idle' | 'loading' | 'done';`
- Line 12: `const [state, setState] = useState<PageState>('idle');`
- Lines 99–104: `done` block — React fragment containing `<ResearchBriefComponent brief={brief} />` and `<BriefChat brief={brief} />`. Both must remain in the `done` block.

- [ ] **Step 1: Update the PageState type alias (line 9)**

Change:
```typescript
type PageState = 'idle' | 'loading' | 'done';
```
To:
```typescript
type PageState = 'idle' | 'loading' | 'done' | 'memo';
```

- [ ] **Step 2: Add InvestmentMemo import (after existing imports)**

```typescript
import InvestmentMemo from '@/components/InvestmentMemo';
```

- [ ] **Step 3: Add memo state variables (after line 15 — after existing useState declarations)**

```typescript
const [memo, setMemo] = useState<string | null>(null);
const [memoLoading, setMemoLoading] = useState(false);
const [memoError, setMemoError] = useState<string | null>(null);
```

- [ ] **Step 4: Add handleGenerateMemo function (after handleSubmit, before the return)**

```typescript
const handleGenerateMemo = async () => {
  if (!brief) return;
  setMemoLoading(true);
  setMemoError(null);
  try {
    const res = await fetch('/api/memo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
    });
    const data = await res.json() as { success: boolean; memo?: string; error?: string };
    if (!data.success || !data.memo) {
      setMemoError(data.error ?? 'Failed to generate memo');
      return;
    }
    setMemo(data.memo);
    setState('memo');
  } catch (err) {
    setMemoError(err instanceof Error ? err.message : 'Failed to generate memo');
  } finally {
    setMemoLoading(false);
  }
};
```

- [ ] **Step 5: Update the render block**

The current `done` block (lines 99–104) is:
```tsx
        {/* Brief */}
        {state === 'done' && brief && (
          <>
            <ResearchBriefComponent brief={brief} />
            <BriefChat brief={brief} />
          </>
        )}
```

Replace it with the following. This preserves `BriefChat`, adds the `onGenerateMemo` prop, adds the memo loading overlay (fullscreen, rendered at `div.max-w-2xl` level as a sibling of other content), adds the memo error banner, and adds the `memo` state render:

```tsx
        {/* Brief */}
        {state === 'done' && brief && (
          <>
            <ResearchBriefComponent brief={brief} onGenerateMemo={handleGenerateMemo} />
            <BriefChat brief={brief} />
          </>
        )}

        {/* Memo loading overlay — shown while generating memo (state stays 'done') */}
        {memoLoading && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(10,10,14,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <p
              className="text-sm animate-pulse"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}
            >
              Drafting memo...
            </p>
          </div>
        )}

        {/* Memo error — shown on failure, brief stays visible */}
        {memoError && state === 'done' && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'rgba(255,79,79,0.08)',
              border: '1px solid rgba(255,79,79,0.2)',
              color: 'var(--accent-red)',
              fontFamily: 'var(--font-ibm-sans)',
            }}
          >
            Memo generation failed: {memoError}
          </div>
        )}

        {/* Memo view */}
        {state === 'memo' && memo && (
          <InvestmentMemo memo={memo} onBack={() => setState('done')} />
        )}
```

- [ ] **Step 6: Verify TypeScript**

Run: `cd glasswing-research && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add glasswing-research/src/app/page.tsx
git commit -m "feat: wire up memo state machine in page.tsx"
```

---

## Chunk 4: End-to-End Verification

### Task 6: Manual smoke test

- [ ] **Step 1: Start the dev server**

Run: `cd glasswing-research && npm run dev`
Expected: Server starts on http://localhost:3000

- [ ] **Step 2: Verify the happy path**

1. Open http://localhost:3000
2. Enter a company URL and click Analyze
3. Wait for ResearchBrief to appear — confirm "Generate Investment Memo →" button is visible at the bottom of the brief
4. Click the button — confirm the fullscreen "Drafting memo..." overlay appears (brief should be blurred behind it)
5. Wait for response — confirm page transitions to InvestmentMemo view (brief disappears, memo fills screen)
6. Confirm all 9 section headers render (EXECUTIVE SUMMARY through RECOMMENDATION)
7. Click "Copy to Clipboard" — paste into a text editor, confirm the full memo text is present
8. Click "← Back to Brief" — confirm the brief and BriefChat are visible again (memo is gone)

- [ ] **Step 3: Verify the error path**

1. Temporarily break the memo endpoint (e.g., set `ANTHROPIC_API_KEY=invalid` in `.env.local`, restart dev server)
2. Generate a brief, then click "Generate Investment Memo →"
3. Confirm: overlay appears then disappears, brief remains fully visible, red error banner appears below the brief reading "Memo generation failed: ..."
4. Restore the correct API key and restart the dev server

- [ ] **Step 4: Verify TypeScript build**

Run: `cd glasswing-research && npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 5: Commit**

```bash
git add glasswing-research/src/app/api/memo/route.ts \
        glasswing-research/src/components/InvestmentMemo.tsx \
        glasswing-research/src/components/ResearchBrief.tsx \
        glasswing-research/src/app/page.tsx \
        glasswing-research/src/lib/types.ts
git commit -m "feat: investment memo — full implementation complete"
```
