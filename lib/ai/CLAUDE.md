# lib/ai/ — AI Agent Layer

This directory contains all AI-powered generation and analysis agents.

## Dual AI System

| Provider | SDK | Client File | Purpose |
|----------|-----|-------------|---------|
| **xAI Grok** | `openai` (baseURL override) | `client.ts` | Session generation — turns student submissions into the 10-section interview sheet |
| **Google Gemini** | `@google/genai` | `geminiClient.ts` | Everything else — analysis, profiles, insights, summaries, SQL agent |

## How to Use AI Clients

```ts
// For Gemini (most agents):
import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
const ai = getGeminiClient()
const model = getGeminiModel()

// For xAI Grok (session generation only):
import { generateQuestionSheet } from '@/lib/ai/client'
```

**NEVER create a new `GoogleGenAI` instance directly.** Always import from `geminiClient.ts`.

## Agent Catalog

### Fire-and-forget (async, no response needed by caller)
These are triggered by `/api/process` or debrief completion and run in the background:
- `classInsights.ts` — `generateClassInsights(userId)` — upserts class_insights table
- `studentProfile.ts` — `generateStudentProfiles()` — upserts student_profiles table
- `tierClassifier.ts` — tier classification for student submissions

### Synchronous (caller awaits the result)
- `client.ts` — `generateQuestionSheet()` — xAI Grok, main session generation
- `analysisAgent.ts` — `runSessionAnalysis()`, `runThemeAnalysis()` — called client-side from `/preview`
- `debriefSummary.ts` — `generateDebriefSummary()` — called when debrief marked complete
- `sqlAgent.ts` — NL-to-SQL-to-answer for analytics queries
- `reportAgent.ts` — semester report generation
- `storyAgent.ts` — narrative story generation
- `speakerBrief.ts` — speaker brief generation
- `speakerPortal.ts` / `speakerPortalPostSession.ts` — speaker portal content
- `comparisonAgent.ts` / `semesterComparison.ts` — comparison analysis
- `synthesisAgent.ts` — theme synthesis across sessions
- `speakerAnalysisEvaluation.ts` — evaluates student speaker analyses
- `speakerRecommendations.ts` — generates speaker recommendations
- `debriefReflectionAnalysis.ts` — analyzes student post-session reflections

### Support files
- `prompt.ts` — built-in system prompt template, `DEFAULT_SYSTEM_PROMPT`, custom prompt interpolation, validation helpers
- `geminiClient.ts` — shared Gemini client singleton

## Adding a New Agent

1. Create `lib/ai/yourAgent.ts`
2. Import client from `geminiClient.ts` (or `client.ts` for xAI)
3. Define your generation function with typed input/output
4. If fire-and-forget: call with `.catch(console.error)` from the API route
5. If sync: return the result to the caller
6. Add the agent to the catalog above
