/** A single NAICS code result. */
export interface NaicsCode {
  code: string;
  title: string;
  description: string;
  /** 2-digit sector code (first 2 chars of the code). */
  sector: string;
  /** 3-digit subsector code (first 3 chars of the code). */
  subsector: string;
}

/** Top-level response from the NAICS search API. */
export interface NaicsSearchResponse {
  /** Array of matching NAICS codes. May be empty. */
  results: NaicsCode[];
}
