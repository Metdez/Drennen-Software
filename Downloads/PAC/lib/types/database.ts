// ─── Entity ──────────────────────────────────────────────────────────────────

export type EntityType = 'think_tank' | 'media_amplifier' | 'donor' | 'politician';

export interface Entity {
  id: string;
  name: string;
  slug: string;
  type: EntityType;
  description: string | null;
  image_url: string | null;
  lean: string | null;
  key_angle: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type EntityInsert = Omit<Entity, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type EntityUpdate = Partial<Omit<Entity, 'id'>> & { id: string };

// ─── Financial ───────────────────────────────────────────────────────────────

export interface Financial {
  id: string;
  entity_id: string;
  fiscal_year: number;
  total_revenue: number | null;
  total_expenses: number | null;
  total_assets: number | null;
  executive_comp: number | null;
  lobbying_expenses: number | null;
  source_filing_url: string | null;
  source_api: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
}

export type FinancialInsert = Omit<Financial, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  raw_data?: Record<string, unknown>;
  total_revenue?: number | null;
  total_expenses?: number | null;
  total_assets?: number | null;
  executive_comp?: number | null;
  lobbying_expenses?: number | null;
  source_filing_url?: string | null;
  source_api?: string | null;
};

export type FinancialUpdate = Partial<Omit<Financial, 'id'>> & { id: string };

// ─── Donation ────────────────────────────────────────────────────────────────

export interface Donation {
  id: string;
  donor_id: string | null;
  donor_name: string;
  recipient_id: string | null;
  amount: number | null;
  fiscal_year: number | null;
  source: string | null;
  source_url: string | null;
  industry_code: string | null;
  industry_bucket: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type DonationInsert = Omit<Donation, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  donor_id?: string | null;
  recipient_id?: string | null;
  amount?: number | null;
  fiscal_year?: number | null;
  source?: string | null;
  source_url?: string | null;
  industry_code?: string | null;
  industry_bucket?: string | null;
  metadata?: Record<string, unknown>;
};

export type DonationUpdate = Partial<Omit<Donation, 'id'>> & { id: string };

// ─── PolicyPaper ─────────────────────────────────────────────────────────────

export interface PolicyPaper {
  id: string;
  entity_id: string;
  title: string;
  url: string | null;
  published_date: string | null;
  topic_tags: string[] | null;
  summary: string | null;
  donor_alignment_score: number | null;
  donor_alignment_rationale: string | null;
  embedding: number[] | null;
  raw_text: string | null;
  created_at: string;
}

export type PolicyPaperInsert = Omit<PolicyPaper, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  url?: string | null;
  published_date?: string | null;
  topic_tags?: string[] | null;
  summary?: string | null;
  donor_alignment_score?: number | null;
  donor_alignment_rationale?: string | null;
  embedding?: number[] | null;
  raw_text?: string | null;
};

export type PolicyPaperUpdate = Partial<Omit<PolicyPaper, 'id'>> & { id: string };

// ─── Legislation ─────────────────────────────────────────────────────────────

export type Chamber = 'house' | 'senate';

export interface Legislation {
  id: string;
  bill_id: string;
  title: string;
  congress_number: number | null;
  chamber: Chamber | null;
  status: string | null;
  topic_tags: string[] | null;
  summary: string | null;
  url: string | null;
  created_at: string;
}

export type LegislationInsert = Omit<Legislation, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  congress_number?: number | null;
  chamber?: Chamber | null;
  status?: string | null;
  topic_tags?: string[] | null;
  summary?: string | null;
  url?: string | null;
};

export type LegislationUpdate = Partial<Omit<Legislation, 'id'>> & { id: string };

// ─── PolicyLegislationLink ───────────────────────────────────────────────────

export interface PolicyLegislationLink {
  id: string;
  policy_paper_id: string;
  legislation_id: string;
  entity_id: string;
  link_type: string | null;
  confidence: number | null;
  evidence: string | null;
  created_at: string;
}

export type PolicyLegislationLinkInsert = Omit<PolicyLegislationLink, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  link_type?: string | null;
  confidence?: number | null;
  evidence?: string | null;
};

export type PolicyLegislationLinkUpdate = Partial<Omit<PolicyLegislationLink, 'id'>> & { id: string };

// ─── PoliticianConnection ────────────────────────────────────────────────────

export interface PoliticianConnection {
  id: string;
  politician_id: string;
  entity_id: string;
  connection_type: string | null;
  amount: number | null;
  fiscal_year: number | null;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

export type PoliticianConnectionInsert = Omit<PoliticianConnection, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  connection_type?: string | null;
  amount?: number | null;
  fiscal_year?: number | null;
  source?: string | null;
  source_url?: string | null;
};

export type PoliticianConnectionUpdate = Partial<Omit<PoliticianConnection, 'id'>> & { id: string };

// ─── LobbyingFiling ─────────────────────────────────────────────────────────

export interface LobbyingFiling {
  id: string;
  client_name: string;
  client_entity_id: string | null;
  registrant_name: string | null;
  amount: number | null;
  filing_period: string | null;
  issues: string[] | null;
  specific_issues: string | null;
  source_url: string | null;
  created_at: string;
}

export type LobbyingFilingInsert = Omit<LobbyingFiling, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  client_entity_id?: string | null;
  registrant_name?: string | null;
  amount?: number | null;
  filing_period?: string | null;
  issues?: string[] | null;
  specific_issues?: string | null;
  source_url?: string | null;
};

export type LobbyingFilingUpdate = Partial<Omit<LobbyingFiling, 'id'>> & { id: string };

// ─── GovContract ─────────────────────────────────────────────────────────────

export interface GovContract {
  id: string;
  recipient_name: string;
  recipient_entity_id: string | null;
  agency: string | null;
  amount: number | null;
  fiscal_year: number | null;
  naics_code: string | null;
  description: string | null;
  source_url: string | null;
  created_at: string;
}

export type GovContractInsert = Omit<GovContract, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
  recipient_entity_id?: string | null;
  agency?: string | null;
  amount?: number | null;
  fiscal_year?: number | null;
  naics_code?: string | null;
  description?: string | null;
  source_url?: string | null;
};

export type GovContractUpdate = Partial<Omit<GovContract, 'id'>> & { id: string };

// ─── AnalysisVerdict ─────────────────────────────────────────────────────────

export type Verdict = 'donor_captured' | 'partially_captured' | 'mostly_independent' | 'independent';

export interface AnalysisVerdict {
  id: string;
  entity_id: string;
  verdict: Verdict;
  confidence: number | null;
  rationale: string | null;
  key_evidence: Record<string, unknown> | null;
  last_analyzed: string;
}

export type AnalysisVerdictInsert = Omit<AnalysisVerdict, 'id' | 'last_analyzed'> & {
  id?: string;
  last_analyzed?: string;
  confidence?: number | null;
  rationale?: string | null;
  key_evidence?: Record<string, unknown> | null;
};

export type AnalysisVerdictUpdate = Partial<Omit<AnalysisVerdict, 'id'>> & { id: string };

// ─── AiUsage ────────────────────────────────────────────────────────────────

export interface AiUsage {
  id: string;
  entity_id: string | null;
  analysis_type: 'alignment' | 'verdict' | 'media';
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  model: string;
  created_at: string;
}

export type AiUsageInsert = Omit<AiUsage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ─── RefreshLog ────────────────────────────────────────────────────────────

export type RefreshLogStatus = 'started' | 'completed' | 'failed' | 'skipped';

export interface RefreshLog {
  id: string;
  run_id: string;
  step: string;
  status: RefreshLogStatus;
  records_processed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export type RefreshLogInsert = Omit<RefreshLog, 'id' | 'started_at'> & {
  id?: string;
  started_at?: string;
  records_processed?: number;
  error_message?: string | null;
  completed_at?: string | null;
};

export type RefreshLogUpdate = Partial<Omit<RefreshLog, 'id'>> & { id: string };
