/**
 * @file types/student_profile.ts
 * @description Student AI profile and growth intelligence types.
 *
 * After each session upload, `lib/ai/studentProfile.ts` runs fire-and-forget
 * to generate or update an AI profile for each participating student.
 * Profiles synthesise submissions, debrief reflections, and speaker analyses
 * into a holistic view of a student's intellectual growth over the semester.
 *
 * This file also contains professor note types — manual annotations that
 * survive AI profile regeneration and support follow-up flagging.
 *
 * Data is stored in `student_profiles` and `professor_student_notes`, accessed via:
 *   GET/POST /api/roster/[studentName]/profile → StudentProfile
 *   GET/POST/DELETE /api/roster/[studentName]/notes → ProfessorNote[]
 *
 * Rendered on the "Profile" and "Growth" tabs of /roster/[studentName].
 *
 * All types here are Domain types (no separate Row type — the `student_profiles`
 * table stores the AI profile as a flat JSONB column alongside a denormalised
 * `growth_signal` text column).
 */

/**
 * A point-in-time snapshot of a student's intellectual engagement for one session.
 * Ordered chronologically within `GrowthIntelligence.snapshots` to form the
 * growth arc visualisation.
 */
/**
 * Represents a snapshot of a student's growth and engagement for a single session.
 * Used to provide a chronological timeline of a student's development, forming the basis for overall growth intelligence.
 * Includes specific labels for thinking phase, thinking style, engagement depth, key themes, and an AI-generated narrative for that session. The 'date' field is an ISO date string, and 'phase' follows a predefined progression of thinking sophistication.
 */
export interface GrowthSnapshot {
  sessionId: string
  speakerName: string
  /** ISO date string of the session. */
  date: string
  /**
   * Thinking sophistication phase at the time of this session.
   * 'surface' → 'emerging' → 'developing' → 'sophisticated'
   */
  phase: 'surface' | 'emerging' | 'developing' | 'sophisticated'
  /** Short label describing the student's thinking style in this session. */
  thinkingLabel: string
  /** Short label describing the student's engagement depth in this session. */
  engagementLabel: string
  /** Key themes in this student's questions for this session. */
  themes: string[]
  /** AI-generated narrative for this snapshot. */
  narrative: string
}

/**
 * Describes the trajectory of a student's thinking sophistication across sessions.
 */
/**
 * Describes the trajectory of a student's thinking sophistication across multiple sessions.
 * Used to offer an analytical summary of how a student's cognitive abilities and depth of thought have developed over time.
 * Captures the 'currentPhase' (a descriptive label), specific 'observations' about their thinking evolution, and 'evidenceHighlights' with quoted or paraphrased submissions.
 */
export interface ThinkingSophisticationArc {
  /** Label for where the student currently sits (e.g. "Developing Analyst"). */
  currentPhase: string
  /** Specific observations about how their thinking has evolved. */
  observations: string[]
  /** Quoted or paraphrased evidence from their submissions. */
  evidenceHighlights: string[]
}

/**
 * Describes how the themes in a student's questions have evolved across sessions.
 */
/**
 * Describes how the themes in a student's questions have evolved across sessions.
 * Used to understand a student's areas of interest, their thematic focus, and how their inquiries change throughout a course or semester.
 * Features a 'coherenceLabel' that classifies the pattern of thematic focus (e.g., 'focused', 'broadening', 'scattered', 'converging'), identifies 'recurringThreads', and provides interpretive 'observations'.
 */
export interface ThemeEvolution {
  /**
   * How the student's thematic focus has changed:
   *   'focused'    — consistently exploring the same core area
   *   'broadening' — expanding into new topic areas
   *   'scattered'  — jumping between unrelated areas
   *   'converging' — pulling together earlier scattered interests
   */
  coherenceLabel: 'focused' | 'broadening' | 'scattered' | 'converging'
  /** Topics that appear repeatedly across multiple sessions. */
  recurringThreads: string[]
  /** Observations about what this thematic pattern reveals about the student. */
  observations: string[]
}

/**
 * Assessment of a student's critical thinking development over the semester.
 */
/**
 * Assesses a student's critical thinking development over a period, typically a semester.
 * Used to provide a high-level summary of a student's critical thinking prowess, identifying strengths and areas for improvement.
 * Includes a 'currentLevel' label, specific 'observations' supported by evidence from submissions, identification of their 'strongestArea' of critical thinking, and their 'growthEdge' where there is most room for development.
 */
export interface CriticalThinkingDevelopment {
  /** Label describing current critical thinking level (e.g. "Emerging Analyst"). */
  currentLevel: string
  /** Specific observations with evidence from submissions. */
  observations: string[]
  /** The dimension of critical thinking where this student shows the most ability. */
  strongestArea: string
  /** The dimension where there is most room for growth. */
  growthEdge: string
}

/**
 * Describes the consistency and depth of a student's engagement across sessions.
 */
/**
 * Describes the consistency and depth of a student's engagement across sessions.
 * Used to understand a student's participation habits, including how regularly they engage and the quality of their contributions.
 * Classifies engagement consistency with a 'consistencyLabel' ('steady', 'improving', 'declining', 'sporadic') and depth trends with 'depthTrend' ('deepening', 'stable', 'thinning'). Also includes specific 'observations' about these patterns.
 */
export interface EngagementPattern {
  /**
   * Consistency of participation across sessions.
   * 'steady' means participating in most sessions at a consistent level.
   */
  consistencyLabel: 'steady' | 'improving' | 'declining' | 'sporadic'
  /** Whether the depth of questions is getting better, staying the same, or declining. */
  depthTrend: 'deepening' | 'stable' | 'thinning'
  /** Specific observations about engagement patterns. */
  observations: string[]
}

/**
 * One-word summary signal of a student's overall growth trajectory.
 * Denormalised into `student_profiles.growth_signal` for fast list sorting/filtering.
 */
/**
 * A union type representing a single-word summary signal of a student's overall growth trajectory.
 * Used to provide a concise, denormalized signal for fast list sorting and filtering of student lists, giving an immediate impression of their growth.
 * This type enumerates possible growth states like 'Accelerating', 'Deepening', 'Emerging', 'Consistent', 'Plateauing', and 'New'. It is explicitly noted that this signal is denormalized into `student_profiles.growth_signal` for database efficiency.
 */
export type GrowthSignal = 'Accelerating' | 'Deepening' | 'Emerging' | 'Consistent' | 'Plateauing' | 'New'

/**
 * Full growth intelligence analysis for a student across all their sessions.
 * This is the richest part of the student profile, populated when enough
 * session data exists (typically 2+ sessions).
 */
/**
 * Represents a comprehensive AI-generated analysis of a student's growth across all their sessions.
 * This is the richest part of the student profile, providing a holistic view of their development when sufficient session data (typically 2 or more sessions) is available.
 * Aggregates an 'overallSignal' (GrowthSignal), detailed analyses like 'thinkingArc', 'themeEvolution', 'criticalThinking', and 'engagementPattern'. It also includes a chronological list of 'snapshots', 'aiRecommendations' for the professor, and a 'semesterHighlight' summarising the student's arc.
 */
export interface GrowthIntelligence {
  /** Overall growth trajectory summary label. */
  overallSignal: GrowthSignal
  /** How the student's thinking sophistication has evolved. */
  thinkingArc: ThinkingSophisticationArc
  /** How the themes in their questions have evolved. */
  themeEvolution: ThemeEvolution
  /** Assessment of their critical thinking development. */
  criticalThinking: CriticalThinkingDevelopment
  /** Consistency and depth of their participation. */
  engagementPattern: EngagementPattern
  /** Chronological per-session snapshots forming the growth timeline. */
  snapshots: GrowthSnapshot[]
  /** Concrete suggestions for the professor on how to support this student's growth. */
  aiRecommendations: string[]
  /** One or two sentence highlight summarising this student's semester arc. */
  semesterHighlight: string
}

// ── Professor notes ───────────────────────────────────────────────────────────

/**
 * A professor-authored note about a student.
 * Stored in `professor_student_notes` — survives AI profile regeneration.
 * Returned by GET /api/roster/[studentName]/notes.
 */
/**
 * Defines the structure for a note authored by a professor about a student.
 * Used to allow professors to add their own observations and context to student profiles, which can inform AI profile generation and human understanding.
 * Stored in the `professor_student_notes` table and is designed to survive AI profile regenerations. Each note includes a unique 'id', the 'studentName', the 'noteText', a 'flaggedForFollowup' boolean, and a 'createdAt' timestamp. It is returned by the GET /api/roster/[studentName]/notes endpoint.
 */
export interface ProfessorNote {
  id: string
  studentName: string
  noteText: string
  /** Whether the professor wants to follow up with this student. */
  flaggedForFollowup: boolean
  createdAt: string
}

// ── Student profile ───────────────────────────────────────────────────────────

/**
 * Full AI-generated student profile, stored as JSONB in `student_profiles.profile`.
 * Returned by GET /api/roster/[studentName]/profile and used in the Profile tab
 * on /roster/[studentName].
 *
 * Generated by `lib/ai/studentProfile.ts` using all three submission types:
 * question submissions, debrief reflections, and speaker analyses.
 */
/**
 * Defines the complete AI-generated student profile, summarizing various aspects of their academic journey.
 * Serves as the primary data structure for displaying a student's comprehensive profile in the application's UI, providing insights into interests, career direction, growth, and personality. It is displayed on the Profile tab at /roster/[studentName].
 * Stored as JSONB in the `student_profiles.profile` database column. This profile is generated by `lib/ai/studentProfile.ts` using input from question submissions, debrief reflections, and speaker analyses. It includes sections for 'interests', 'careerDirection', 'growthTrajectory', 'personality', professor's own 'professorNotes', an optional 'growthIntelligence' section (present for students with 2+ sessions), the 'generatedAt' timestamp, and the 'sessionCount' used for its generation.
 */
export interface StudentProfile {
  /** Topics and subject areas that appear repeatedly in this student's questions. */
  interests: {
    /** Short interest tags (e.g. ["entrepreneurship", "healthcare", "leadership"]). */
    tags: string[]
    /** Detailed observations about the student's interest patterns. */
    observations: string[]
  }
  /** Career paths and professional fields the student seems to be gravitating toward. */
  careerDirection: {
    /** Field labels (e.g. ["product management", "consulting"]). */
    fields: string[]
    observations: string[]
  }
  /** Overall assessment of how the student has grown over the semester. */
  growthTrajectory: {
    direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
    observations: string[]
  }
  /** Personality and engagement style observations based on question patterns. */
  personality: {
    /** Trait labels (e.g. ["analytical", "risk-aware", "big-picture thinker"]). */
    traits: string[]
    observations: string[]
  }
  /**
   * Professor's own notes, included in the profile for holistic AI context.
   * Pulled from `professor_student_notes` at profile generation time.
   */
  professorNotes: string[]
  /**
   * Growth intelligence analysis; present only when the student has participated
   * in 2 or more sessions.
   */
  growthIntelligence?: GrowthIntelligence
  /** ISO timestamp of when this profile was last generated. */
  generatedAt: string
  /** Number of sessions used as input when this profile was generated. */
  sessionCount: number
}
