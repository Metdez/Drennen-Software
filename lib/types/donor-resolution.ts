import type { IndustryBucket } from '../constants/industry-buckets';

/** Result of attempting to resolve a single donor name. */
export interface DonorResolutionResult {
  /** The raw donor_name from the donations table. */
  rawName: string;
  /** Whether resolution succeeded. */
  resolved: boolean;
  /** The entity ID if a match was found or created. Null if unresolved. */
  entityId: string | null;
  /** The canonical company name from OpenCorporates. */
  canonicalName: string | null;
  /** OpenCorporates jurisdiction + company number (for deduplication). */
  opencorporatesId: string | null;
  /** NAICS code, if found. */
  naicsCode: string | null;
  /** Industry bucket derived from NAICS code. */
  industryBucket: IndustryBucket;
  /** Why resolution failed (if it did). */
  failureReason: string | null;
}

/** Checkpoint state for resumable resolution runs. */
export interface DonorResolutionCheckpoint {
  /** ISO timestamp of last run. */
  lastRunAt: string;
  /** Number of donation rows processed so far in this run. */
  processedCount: number;
  /** Total donation rows that need resolution. */
  totalCount: number;
  /** Donor names that could not be resolved. */
  unresolvedNames: string[];
  /** The offset to resume from on next run. */
  resumeOffset: number;
}
