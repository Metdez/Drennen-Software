export interface ResearchBrief {
  companyName: string;
  url: string;
  timestamp: string;
  companyOverview: string;
  foundingTeam: string;
  product: string;
  targetMarket: string;
  competitiveLandscape: string;
  redFlags: string;
  glasswingRelevance: string;
}

export interface ResearchResponse {
  success: boolean;
  brief?: ResearchBrief;
  error?: string;
}
