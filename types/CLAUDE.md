# types/ — TypeScript Type Definitions

## Barrel Export

All types MUST be re-exported from `index.ts`. When creating a new type file, add `export * from './yourFile'` to `index.ts`.

Import types from the barrel:
```ts
import type { Session, StudentProfile, Semester } from '@/types'
```

## Row Types vs Domain Types

- **Row types** (e.g., `SessionRow`, `SavedComparisonRow`): match the snake_case database schema exactly. Used only in `lib/db/` files.
- **Domain types** (e.g., `Session`, `SavedComparison`): camelCase, used everywhere else. Transform functions in `lib/db/` or `lib/utils/transforms.ts` convert between them.

## File Organization

One file per domain entity. Naming uses snake_case to match the domain (e.g., `student_profile.ts`, `student_submission.ts`).

| File | Key Types |
|------|-----------|
| `session.ts` | `Session`, `SessionSummary`, `SessionRow` |
| `user.ts` | `AuthUser` |
| `api.ts` | `ProcessResponse`, `ApiError`, `isApiError()` |
| `student_submission.ts` | `StudentSubmission`, `StudentSummary`, `StudentDetail` |
| `student_profile.ts` | `StudentProfile`, `GrowthSignal`, `GrowthIntelligence` |
| `semester.ts` | `Semester`, `CreateSemesterInput`, `SemesterSummary` |
| `analysis.ts` | `SessionAnalysis`, `ThemeCluster`, `ThemeAnalysis` |
| `debrief.ts` | `SessionDebrief`, `QuestionFeedback` |
| `comparison.ts` | `CohortComparisonData`, `ComparativeAnalysis` |
| `subscription.ts` | `SubscriptionAccess`, `SubscriptionProfile` |
| `report.ts` | `ReportConfig`, `ReportContent` |
| `tier.ts` | `TierAssignment`, `TierData` |
| `insights.ts` | `ClassInsights`, `ThemeEvolutionEntry` |
| `portfolio.ts` | `PortfolioConfig`, `PortfolioShare` |
| `story.ts` | `SemesterStory`, `StorySection` |
| `session_synthesis.ts` | `SessionSynthesis` |
| `system_prompt.ts` | `SystemPrompt`, `SystemPromptRow`, `CreateSystemPromptInput` |
| `speaker_portal.ts` | `SpeakerPortalContent`, `SpeakerPortal` |
| `speaker_brief.ts` | `SpeakerBriefContent`, `SpeakerBrief` |
| `student_debrief.ts` | `StudentDebriefSubmissionRow`, `StudentDebriefAnalysis` |
| `student_speaker_analysis.ts` | `StudentSpeakerAnalysis` |
