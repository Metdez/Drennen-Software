/**
 * One-time backfill script: classify question tiers for all existing sessions
 * that don't yet have tier data.
 *
 * Usage:
 *   npx tsx scripts/backfill-tiers.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const geminiApiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!geminiApiKey) {
  console.error('Missing GEMINI_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)
const ai = new GoogleGenAI({ apiKey: geminiApiKey })
const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'

const TIER_DEFINITIONS = `
Tier 1 — Tension/Trade-off questions: Questions that expose a real dilemma, difficult decision, or uncomfortable truth.
Tier 2 — Specific experience questions: Questions that ask about a specific moment, turning point, failure, or decision.
Tier 3 — Strategic insight questions: Questions about how they think, what frameworks they use, what they've learned.
Tier 4 — Generic advice questions: "What advice would you give?" or "What's your morning routine?" Generic questions.
`

async function classifyTiers(speakerName: string, output: string) {
  const prompt = `You are an expert at evaluating the quality of student interview questions for a guest speaker series.

Given the tier definitions below and a generated interview sheet for ${speakerName}, classify each question (both Primary and Backup) into Tier 1, 2, 3, or 4.

## Tier Definitions
${TIER_DEFINITIONS}

## Interview Sheet
${output}

Return a JSON object with this exact structure:
{
  "tierCounts": { "1": <count>, "2": <count>, "3": <count>, "4": <count> },
  "tierAssignments": [
    {
      "tier": <1|2|3|4>,
      "themeNumber": <section number 1-10>,
      "themeTitle": "<section title>",
      "questionType": "primary" | "backup",
      "studentName": "<student attribution>"
    }
  ]
}

Rules:
- Classify every Primary and Backup question (should be 20 total for a standard 10-section sheet)
- tierCounts should sum to the total number of questions classified
- Be strict: only Tier 1 if it truly exposes a tension or trade-off
- Tier 4 is for genuinely generic questions only`

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an expert educational data analyst. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  return JSON.parse(raw)
}

async function main() {
  // Get all sessions
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id, speaker_name, output')
    .order('created_at', { ascending: true })

  if (sessionsError || !sessions) {
    console.error('Failed to fetch sessions:', sessionsError)
    process.exit(1)
  }

  // Get existing tier data
  const { data: existingTiers } = await supabase
    .from('session_tier_data')
    .select('session_id')

  const existingIds = new Set((existingTiers ?? []).map(t => t.session_id))

  const sessionsToProcess = sessions.filter(s => !existingIds.has(s.id))
  console.log(`Found ${sessions.length} total sessions, ${sessionsToProcess.length} need tier classification`)

  let processed = 0
  let failed = 0

  for (const session of sessionsToProcess) {
    try {
      console.log(`[${processed + failed + 1}/${sessionsToProcess.length}] Classifying: ${session.speaker_name}...`)

      const tierData = await classifyTiers(session.speaker_name, session.output)

      const { error } = await supabase
        .from('session_tier_data')
        .upsert({
          session_id: session.id,
          tier_counts: tierData.tierCounts ?? {},
          tier_assignments: tierData.tierAssignments ?? [],
        }, { onConflict: 'session_id' })

      if (error) throw error

      processed++
      console.log(`  ✓ Done (${JSON.stringify(tierData.tierCounts)})`)

      // Rate limit: wait 1s between Gemini calls
      if (processed < sessionsToProcess.length) {
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (err) {
      failed++
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  console.log(`\nBackfill complete: ${processed} processed, ${failed} failed`)
}

main()
