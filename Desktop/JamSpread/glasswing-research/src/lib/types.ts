export interface ResearchRequest {
  url: string;
}

export interface NetworkPerson {
  name: string;
  title: string;
  company: string;
  linkedinUrl?: string;
  location?: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  snippet: string;
  publishedAt: string;
  categories: string[];
}

export interface NewsResult {
  title: string;
  url: string;
  description: string;
  publishedDate?: string;
}

export interface JobPosting {
  title: string;
  url: string;
  country?: string;
  postedAt: string;
}

export interface ResearchBriefSections {
  companyOverview: string;
  foundingTeam: string;
  product: string;
  targetMarket: string;
  competitiveLandscape: string;
  redFlags: string;
  glasswingRelevance: string;
  searchPresence: string;
  aiConsensus: string;
  recentEvents: string;
  newsAndPress: string;
  hiringSignal: string;
  fundingAnalysis: string;
  techStackAnalysis: string;
  networkOpportunity: string;
  competitorComparison: string;
  competitiveMoat: string;
}

export interface FundingRound {
  date: string;
  type: string;
  investors: string;
  amount: string;
  currency: string;
}

export interface CompetitorComparison {
  name: string;
  domain: string;
  employeeCount: number;
  annualRevenue: string;
  totalFunding: string;
  latestFundingStage: string;
  foundedYear: number;
  industry: string;
}

export interface OrgEnrichment {
  name: string;
  foundedYear: number;
  industry: string;
  employeeCount: number;
  annualRevenue: string;
  totalFunding: string;
  latestFundingStage: string;
  latestFundingDate: string;
  fundingRounds: FundingRound[];
  techStack: string[];
  departmentalHeadcount: Record<string, number>;
  linkedinUrl?: string;
  twitterUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  shortDescription?: string;
  keywords?: string[];
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
  chatgptSays?: string;
  perplexitySays?: string;
  apolloNewsArticles?: NewsArticle[];
  newsResults?: NewsResult[];
  newsAiSummary?: string;
  jobPostings?: JobPosting[];
  totalJobPostings?: number;
  orgEnrichment?: OrgEnrichment;
  competitorData?: CompetitorComparison[];
  companyLeadership?: NetworkPerson[];
  companyAlumni?: NetworkPerson[];
  competitors?: { name: string; url: string; description: string }[];
  moatAiSummary?: string;
}

export interface WorkflowResult {
  success: boolean;
  brief?: ResearchBrief;
  error?: string;
}

export interface ScrapeResult {
  markdown: string;
  metadata: {
    title: string;
    description: string;
    sourceURL: string;
  };
}

// API response type
export interface ResearchResponse {
  success: boolean;
  brief?: ResearchBrief;
  error?: string;
}

export interface MemoResponse {
  success: boolean;
  memo?: string;
  error?: string;
}
