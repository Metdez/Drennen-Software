export interface ResearchBriefSections {
  companyOverview: string;
  foundingTeam: string;
  product: string;
  targetMarket: string;
  competitiveLandscape: string;
  redFlags: string;
  glasswingRelevance: string;
}

export interface ResearchBriefMetadata {
  pageTitle: string;
  pageDescription: string;
  sourceUrl: string;
}

export interface ResearchBrief {
  companyName: string;
  companyUrl: string;
  scrapedAt: string;
  sections: ResearchBriefSections;
  metadata: ResearchBriefMetadata;
}

export interface WorkflowResult {
  success: boolean;
  brief?: ResearchBrief;
  error?: string;
}

// API response type
export interface ResearchResponse {
  success: boolean;
  brief?: ResearchBrief;
  error?: string;
}
