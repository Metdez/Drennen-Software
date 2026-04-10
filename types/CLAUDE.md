# types/ — TypeScript Type Definitions

## Barrel Export (MANDATORY)

All types MUST be re-exported from `index.ts`. When creating a new type file, add `export * from './yourFile'` to `index.ts`.

Import types from the barrel:
```ts
import type { Session, StudentProfile, Semester } from '@/types'
```

Never import from a sub-file directly (e.g. `@/types/session`). This keeps imports stable if files are reorganised.

## Row Types vs Domain Types

- **Row types** (e.g., `SessionRow`, `SavedComparisonRow`): match the snake_case database schema exactly. Used only in `lib/db/` files when reading from or writing to Supabase.
- **Domain types** (e.g., `Session`, `SavedComparison`): camelCase, used everywhere else in the app (components, API responses, AI agents). Transform functions in `lib/db/` or `lib/utils/transforms.ts` convert between them.

Rule: if a type has `Row` in its name, it must not appear outside `lib/db/`.

**AI output types (JSONB blobs):** Some types are stored as JSONB in the database and returned to the client as-is without transformation. These have no Row counterpart — they ARE the domain type. Examples: `SessionAnalysis`, `ClassInsights`, `SessionSynthesis`, `StudentDebriefAnalysis`, `StudentSpeakerAnalysis`, `StudentProfile`, `GrowthIntelligence`.

## File Organization

One file per domain entity. File names use snake_case to match the database table naming convention.

## Naming Conventions

| Pattern | Example | When to use |
|---------|---------|-------------|
| `<Entity>Row` | `SessionRow` | Raw DB row — snake_case, `lib/db/` only |
| `<Entity>` | `Session` | Domain object — camelCase, used everywhere |
| `Create<Entity>Input` | `CreateSemesterInput` | POST body for inserting a new record |
| `Update<Entity>Input` | `UpdateSemesterInput` | PATCH body — all fields optional |
| `Upsert<Entity>Input` | `UpsertDebriefInput` | Partial upsert — supports auto-save patterns |

## Three Student Submission Types

The system tracks three distinct submission types per student per session. Each has its own table, Row type, and AI analysis result type:

| Submission type | Timing | DB table | Row type | Analysis result type |
|----------------|---------|----------|----------|----------------------|
| Question submission | Pre-session (ZIP upload) | `student_submissions` | `StudentSubmissionRow` | `SessionAnalysis` (aggregated) |
| Debrief reflection | Post-session | `student_debrief_submissions` | `StudentDebriefSubmissionRow` | `StudentDebriefAnalysis` |
| Speaker analysis | Post-session | `student_speaker_analysis_submissions` | `StudentSpeakerAnalysisSubmissionRow` | `StudentSpeakerAnalysis` |

All three feed into `StudentProfile` / `GrowthIntelligence` generation via `lib/ai/studentProfile.ts`.

## Complete Type Inventory

| File | Key Types Exported | DB Table(s) | Used By |
|------|--------------------|-------------|---------|
| `session.ts` | `SessionRow`, `Session`, `CreateSessionInput`, `SessionSummary`, `SessionShareRow`, `SessionShare` | `sessions`, `session_shares` | `lib/db/sessions.ts`, `lib/db/sessionShares.ts`, `/api/sessions`, `/preview` |
| `user.ts` | `AuthUser` | — (Supabase auth) | `lib/db/users.ts`, all authenticated API routes |
| `api.ts` | `ProcessResponse`, `GetSessionsResponse`, `GetSessionResponse`, `ApiError`, `ApiResult<T>`, `isApiError()` | — | All API routes + client-side fetch callers |
| `student_submission.ts` | `StudentSubmissionRow`, `StudentSubmission`, `CreateStudentSubmissionsInput`, `StudentSummary`, `SessionWithSubmission`, `StudentDetail` | `student_submissions` | `lib/db/studentSubmissions.ts`, `/api/roster` |
| `student_profile.ts` | `GrowthSnapshot`, `ThinkingSophisticationArc`, `ThemeEvolution`, `CriticalThinkingDevelopment`, `EngagementPattern`, `GrowthSignal`, `GrowthIntelligence`, `ProfessorNote`, `StudentProfile` | `student_profiles`, `professor_student_notes` | `lib/db/studentProfiles.ts`, `lib/db/professorNotes.ts`, `/api/roster/[studentName]/profile` |
| `student_debrief.ts` | `StudentDebriefSubmissionRow`, `StudentDebriefAnalysis` | `student_debrief_submissions`, `student_debrief_analyses` | `lib/db/studentDebriefs.ts`, `/api/sessions/[id]/student-debriefs` |
| `student_speaker_analysis.ts` | `StudentSpeakerAnalysisSubmissionRow`, `StudentSpeakerAnalysis` | `student_speaker_analysis_submissions`, `student_speaker_analyses` | `lib/db/studentSpeakerAnalyses.ts`, `/api/sessions/[id]/speaker-analyses` |
| `analysis.ts` | `ThemeQuestion`, `ThemeCluster`, `SessionAnalysis`, `ThemeAnalysis`, `CrossSessionThemeAnalysis` | `session_analyses` | `lib/db/sessionAnalyses.ts`, `lib/ai/analysisAgent.ts`, `/api/sessions/[id]/analysis` |
| `analytics.ts` | `SessionAnalyticsRow`, `LeaderboardEntry`, `DropoffEntry`, `AnalyticsData` | — (computed views) | `lib/db/analytics.ts`, `/api/analytics`, `/analytics` page |
| `insights.ts` | `ThemeEvolutionEntry`, `ClassInsights`, `SpeakerPatternAnalysis`, `SpeakerRecommendations` | `class_insights` | `lib/db/classInsights.ts`, `lib/ai/classInsights.ts`, `/api/analytics/insights` |
| `debrief.ts` | `QuestionStatus`, `DebriefStatus`, `QuestionFeedback`, `StudentObservation`, `SessionDebriefRow`, `SessionDebrief`, `UpsertDebriefInput` | `session_debriefs` | `lib/db/debriefs.ts`, `/api/sessions/[id]/debrief`, DebriefPanel |
| `comparison.ts` | `SessionComparisonSide`, `ThemeOverlapResult`, `ParticipationDelta`, `SessionComparisonData`, `ComparativeAnalysis`, `SavedComparisonRow`, `SavedComparison`, `SemesterComparisonStats`, `ThemePersistence`, `CohortComparisonData`, `CohortComparisonRow`, `CohortComparison` | `saved_comparisons`, `cohort_comparisons` | `lib/db/savedComparisons.ts`, `/api/compare`, `/analytics/compare` |
| `tier.ts` | `TierAssignment`, `TierData`, `SessionTierDataRow`, `SessionTierData` | `session_tier_data` | `lib/db/tierData.ts`, `lib/ai/tierClassifier.ts`, bundled in comparison/report payloads |
| `semester.ts` | `SemesterRow`, `Semester`, `CreateSemesterInput`, `UpdateSemesterInput`, `SemesterSummary` | `semesters` | `lib/db/semesters.ts`, `/api/semesters`, `/semesters` page |
| `report.ts` | `ReportConfig`, `ExecutiveSummarySection`, `SemesterGlanceSection`, `SessionSummaryEntry`, `SessionSummariesSection`, `ThemeEvolutionSection`, `StudentEngagementSection`, `StudentGrowthHighlight`, `StudentGrowthSection`, `QuestionQualitySection`, `BlindSpotsSection`, `SpeakerRanking`, `SpeakerEffectivenessSection`, `RosterEntry`, `AppendixRosterSection`, `ReportContent`, `SemesterReportRow`, `SemesterReport` | `semester_reports` | `lib/db/reports.ts`, `lib/ai/reportAgent.ts`, `/api/reports` |
| `story.ts` | `StorySectionKey`, `StorySection`, `SemesterStory`, `SemesterStoryRow` | `semester_stories` | `lib/db/stories.ts`, `lib/ai/storyAgent.ts`, `/api/stories` |
| `subscription.ts` | `SubscriptionAccess`, `SubscriptionProfile` | `profiles` (Stripe fields) | `lib/db/subscription.ts`, `/api/subscription`, SubscriptionContext |
| `portfolio.ts` | `PortfolioConfig`, `PortfolioShareRow`, `PortfolioShare`, `DEFAULT_PORTFOLIO_CONFIG` | `portfolio_shares` | `lib/db/portfolioShares.ts`, `/api/portfolio`, PortfolioSharePanel |
| `speaker_brief.ts` | `SpeakerBriefContent`, `SpeakerBriefRow`, `SpeakerBrief` | `speaker_briefs` | `lib/db/speakerBriefs.ts`, `lib/ai/speakerBrief.ts`, `/preview/brief` |
| `speaker_portal.ts` | `SpeakerPortalContent`, `PostSessionFeedback`, `SpeakerPortalRow`, `SpeakerPortal` | `speaker_portals` | `lib/db/speakerPortals.ts`, `lib/ai/speakerPortal.ts`, `/preview/portal`, `/speaker/[token]` |
| `session_synthesis.ts` | `SessionSynthesis` | `session_syntheses` | `lib/db/sessionSyntheses.ts`, `lib/ai/synthesisAgent.ts`, `/api/sessions/[id]/synthesis` |
| `system_prompt.ts` | `SystemPromptRow`, `SystemPrompt`, `CreateSystemPromptInput` | `custom_system_prompts` | `lib/db/systemPrompts.ts`, `/api/system-prompts`, SystemPromptEditor |

## Anti-patterns

- **Never import from a sub-file directly.** Always import from `@/types`.
- **Never use Row types outside `lib/db/`.** Row types exist only to type Supabase query results.
- **Never skip adding a new type to `index.ts`.** The barrel is the public API for this directory.
- **Never add logic to type files.** The only exception is `isApiError()` in `api.ts` (a pure type guard) and `DEFAULT_PORTFOLIO_CONFIG` in `portfolio.ts` (a pure constant).
- **Never define types inline in component or API files** unless they are genuinely local and single-use. Shared types belong here.
