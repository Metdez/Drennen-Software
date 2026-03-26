# Student Profile AI Analysis — Design Spec

**Date:** 2026-03-26
**Status:** Draft

## Problem

When a professor clicks into a student on the Roster page, they only see a list of raw submissions. There's no synthesized view of who the student is — their interests, trajectory, or how to support them. Professors want actionable intelligence on each student without manually reading every submission.

## Solution

Add a Gemini-powered **Student Profile** to the student detail page (`/roster/[studentName]/`). The page gets a **tabbed layout** (Profile | Submissions):

- **Profile tab**: AI-generated analysis with 5 sections — Interests, Career Direction, Growth Trajectory, Personality, Professor Notes
- **Submissions tab**: The existing session cards (unchanged)

Profiles auto-regenerate after every ZIP upload via fire-and-forget from `/api/process`.

## Architecture

### Storage: `student_profiles` table

One row per (professor, student) pair. Mirrors the `class_insights` / `session_analyses` pattern.

```sql
CREATE TABLE student_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  analysis     JSONB NOT NULL,
  session_count INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX student_profiles_user_student_idx
  ON student_profiles(user_id, student_name);

ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own student profiles"
  ON student_profiles FOR SELECT
  USING (auth.uid() = user_id);
```

Service role handles writes (fire-and-forget inserts/upserts).

### TypeScript Type: `StudentProfile`

```ts
export interface StudentProfile {
  interests: {
    tags: string[]       // e.g. ["Sports Business", "Media Rights", "Entertainment Law"]
    narrative: string    // 2-3 sentence explanation
  }
  careerDirection: {
    fields: string[]     // e.g. ["Media Management", "Entertainment Law"]
    narrative: string    // 2-3 sentence explanation
  }
  growthTrajectory: {
    direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
    narrative: string    // describes how question depth has evolved
  }
  personality: {
    traits: string[]     // e.g. ["Curious", "Practical", "Strategic"]
    narrative: string    // 2-3 sentence explanation
  }
  professorNotes: string[]  // actionable bullet points
  generatedAt: string       // ISO timestamp
  sessionCount: number      // sessions at generation time
}
```

### Generation Strategy: Per-Student Targeted Regeneration

After each ZIP upload, only regenerate profiles for students who appeared in the new submission batch.

**Why per-student (not batch all)?**
- Better Gemini output quality — focused context per student
- Isolated failures — one student's error doesn't block others
- Efficient — unchanged students keep their existing profile
- Token-safe — one student's history is always small enough

**Flow:**
1. `/api/process` already has the `submissions` array with `studentName` fields
2. Extract unique student names from the new upload
3. Fire-and-forget: for each affected student, fetch their full submission history, call Gemini, upsert result
4. Process in parallel chunks of 5 (same pattern as `lib/parse/builder.ts`)
5. Use `Promise.allSettled` so individual failures are logged but don't block

### Gemini Prompt

The prompt receives one student's full submission history across all sessions:

```
Student: "Sarah M."
Submissions (oldest first):
1. Speaker: Tim Cook (Jan 15, 2026)
   "How did you decide to pivot Apple toward services revenue..."
2. Speaker: Satya Nadella (Feb 3, 2026)
   "What role does AI play in Microsoft's enterprise strategy..."
...
```

Gemini returns the `StudentProfile` JSON. The prompt instructs:
- **interests**: infer from recurring topics across all questions
- **careerDirection**: infer from what industries/roles the questions suggest
- **growthTrajectory**: compare early vs. recent question sophistication
- **personality**: infer communication style, intellectual approach
- **professorNotes**: 2-4 actionable bullets for the professor (mentorship suggestions, topics to explore, engagement tips)

Uses `responseMimeType: 'application/json'` and the standard markdown-fence stripping pattern from `classInsights.ts`.

### API Route

`GET /api/roster/[studentName]/profile`

1. Auth check via `getCurrentUser()`
2. Decode student name from URL param
3. Fetch from `student_profiles` table via admin client
4. If cached: return it
5. If missing: generate on-demand (fallback), then return
6. Return `{ profile: StudentProfile }` or `{ profile: null }` if no submissions exist

### Frontend

Convert the student detail page to use tabs:

**Server component** (`page.tsx`): keeps auth check + data fetching, passes data to a client component wrapper.

**Client component** (`StudentDetailTabs`): manages tab state (Profile | Submissions).

**Profile tab** (`StudentProfileTab`):
- Fetches `/api/roster/[name]/profile` on mount
- Shows loading skeleton during fetch
- Renders 5 sections in a 2-column grid:
  - Interests: purple tag pills + narrative
  - Career Direction: orange tag pills + narrative
  - Growth Trajectory: direction badge (gradient bar) + narrative
  - Personality: purple-tinted trait pills + narrative
  - Professor Notes: full-width card with bulleted recommendations (below the grid)
- Error state with retry button (same pattern as preview page analysis)

**Submissions tab**: Renders the existing `StudentSessionCard` list unchanged.

### Auto-Refresh on Upload

In `/api/process/route.ts`, add a third fire-and-forget block after the existing two:

```ts
const affectedStudents = [...new Set(submissions.map(s => s.studentName))]
generateStudentProfiles(user.id, affectedStudents).catch(e =>
  console.error('[/api/process] generateStudentProfiles failed (non-fatal):', e)
)
```

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `types/student_profile.ts` | CREATE | `StudentProfile` interface |
| `types/index.ts` | MODIFY | Add `export * from './student_profile'` |
| `supabase/migrations/20260328000000_student_profiles.sql` | CREATE | Table + RLS + index |
| `lib/db/studentProfiles.ts` | CREATE | `getStudentProfile()`, `upsertStudentProfile()` |
| `lib/ai/studentProfile.ts` | CREATE | `generateStudentProfile()`, `generateStudentProfiles()`, prompt |
| `app/api/roster/[studentName]/profile/route.ts` | CREATE | GET endpoint with fallback |
| `app/api/process/route.ts` | MODIFY | Add fire-and-forget call |
| `lib/constants.ts` | MODIFY | Add `API_STUDENT_PROFILE` route |
| `app/(app)/roster/[studentName]/page.tsx` | MODIFY | Restructure with tabs |
| `components/StudentDetailTabs.tsx` | CREATE | Client component managing tab state |
| `components/StudentProfileTab.tsx` | CREATE | Profile tab with fetch + render |

## Verification

1. **DB migration**: `supabase db reset` — verify table exists in Studio
2. **Fire-and-forget**: Upload a ZIP, check server logs for `generateStudentProfiles` calls
3. **API route**: `GET /api/roster/[encodedName]/profile` returns profile JSON
4. **Fallback**: Visit student page before any upload — profile generates on-demand
5. **UI**: Student detail page shows tabs, Profile tab renders all 5 sections
6. **Re-upload**: Upload another ZIP, revisit student page — profile has updated `generatedAt`
7. **Type check**: `npm run type-check` passes
8. **Lint**: `npm run lint` passes
