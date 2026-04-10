/**
 * @file types/index.ts
 * @description Barrel re-exporter for all domain types used across the app.
 *
 * RULE: Every type defined in any file under types/ MUST be re-exported here.
 * Consumers should always import from '@/types' (the barrel), never from a
 * sub-file directly (e.g. '@/types/session'). This keeps imports stable if
 * files are reorganised in future.
 *
 * Files are grouped loosely by feature area:
 *   Core session & user  → session, user, api
 *   Student data         → student_submission, student_profile,
 *                          student_debrief, student_speaker_analysis
 *   AI analysis          → analysis, insights, tier, session_synthesis
 *   Analytics            → analytics
 *   Post-session capture → debrief
 *   Speaker features     → speaker_brief, speaker_portal
 *   Semesters & reports  → semester, report, story
 *   Cross-session work   → comparison
 *   Sharing & access     → subscription, portfolio, system_prompt
 */
export * from './session'
export * from './user'
export * from './api'
export * from './student_submission'
export * from './analytics'
export * from './insights'
export * from './analysis'
export * from './student_profile'
export * from './speaker_brief'
export * from './debrief'
export * from './semester'
export * from './comparison'
export * from './tier'
export * from './report'
export * from './subscription'
export * from './portfolio'
export * from './speaker_portal'
export * from './student_debrief'
export * from './student_speaker_analysis'
export * from './story'
export * from './session_synthesis'
export * from './system_prompt'
