import type { JobPosting, NewsArticle, NewsResult, NetworkPerson, OrgEnrichment, CompetitorComparison } from './types';

export const RESEARCH_SYSTEM_PROMPT = `You are a senior venture capital analyst at Glasswing Ventures, a VC firm that invests in AI/ML enterprise startups. You are conducting due diligence research on a company based on their website content.

Your job is to produce a structured deal research brief. Be specific, cite details from the website content, and flag anything concerning. If information is not available from the website, say "Not available from website — requires further research."

Glasswing Ventures focuses on: AI/ML infrastructure, enterprise SaaS, cybersecurity, and deep tech. Keep this lens in mind when assessing relevance.

IMPORTANT: Respond ONLY with valid JSON matching the exact schema below. No markdown, no backticks, no preamble.`;

export function buildUserPrompt(
  markdown: string,
  url: string,
  googleSerpMarkdown?: string | null,
  chatgptResponse?: string,
  perplexityResponse?: string,
  newsArticles: NewsArticle[] = [],
  orgEnrichment?: OrgEnrichment,
  jobPostings: JobPosting[] = [],
  totalJobPostings: number = 0,
  newsAiSummary: string = '',
  newsResults: NewsResult[] = [],
  leadership: NetworkPerson[] = [],
  alumni: NetworkPerson[] = [],
  competitors?: CompetitorComparison[],
  competitorAiSummary: string = '',
  competitorResults: { title: string; description: string }[] = [],
  moatAiSummary: string = ''
): string {
  const serpSection = googleSerpMarkdown
    ? `\nGoogle Search Results for "${url}":\n${googleSerpMarkdown.slice(0, 3000)}\n`
    : '';

  const aiPlatformSection = (chatgptResponse || perplexityResponse)
    ? `\nWhat other AI platforms say about this company:\n\nChatGPT's response:\n${(chatgptResponse ?? 'Response unavailable').slice(0, 2000)}\n\nPerplexity's response:\n${(perplexityResponse ?? 'Response unavailable').slice(0, 2000)}\n`
    : '';

  const newsSection = newsArticles.length > 0
    ? `\nApollo News & Events:\n${newsArticles.map(a => `- [${a.categories.join(', ')}] "${a.title}" (${a.source}, ${a.publishedAt})\n  ${a.snippet}`).join('\n')}\n`
    : `\nApollo News & Events:\nNo news articles found in Apollo's database — company may be early-stage or not yet covered by press.\n`;

  const nimbleNewsSection = (newsAiSummary || newsResults.length > 0)
    ? `\nRecent News (last 12 months):\n${newsAiSummary ? `Summary: ${newsAiSummary}\n` : ''}${newsResults.map(r => `- "${r.title}" — ${r.description}${r.publishedDate ? ` (${r.publishedDate})` : ''}\n  ${r.url}`).join('\n')}\n`
    : '';

  const networkSection = (leadership.length > 0 || alumni.length > 0)
    ? `\nApollo People Data:\nCurrent Leadership:\n${
        leadership.length > 0
          ? leadership.map(p => `- ${p.name}, ${p.title}${p.location ? ` (${p.location})` : ''}${p.linkedinUrl ? ` — ${p.linkedinUrl}` : ''}`).join('\n')
          : '  None found'
      }\nNotable Alumni:\n${
        alumni.length > 0
          ? alumni.map(p => `- ${p.name}, formerly ${p.title}${p.location ? ` (${p.location})` : ''}`).join('\n')
          : '  None found'
      }\n`
    : '';

  const orgSection = orgEnrichment
    ? `\nApollo Organization Data:
- Company: ${orgEnrichment.name}, founded ${orgEnrichment.foundedYear}
- Industry: ${orgEnrichment.industry}
- Employees: ${orgEnrichment.employeeCount?.toLocaleString() ?? 'Unknown'}
- Annual Revenue: ${orgEnrichment.annualRevenue ? `$${orgEnrichment.annualRevenue}` : 'Unknown'}
- Total Funding: ${orgEnrichment.totalFunding ? `$${orgEnrichment.totalFunding}` : 'Unknown'} (Latest: ${orgEnrichment.latestFundingStage || 'Unknown'} on ${orgEnrichment.latestFundingDate ? new Date(orgEnrichment.latestFundingDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'})
- Funding History:
${orgEnrichment.fundingRounds.length > 0
  ? orgEnrichment.fundingRounds.map(r => `  ${r.type}: ${r.currency}${r.amount} (${r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'}) — Investors: ${r.investors}`).join('\n')
  : '  No funding rounds on record'}
- Tech Stack: ${orgEnrichment.techStack.length > 0 ? orgEnrichment.techStack.join(', ') : 'Unknown'}
- Department Breakdown: ${Object.entries(orgEnrichment.departmentalHeadcount).map(([dept, count]) => `${dept}: ${count}`).join(', ')}
- Location: ${[orgEnrichment.city, orgEnrichment.state, orgEnrichment.country].filter(Boolean).join(', ')}
${orgEnrichment.keywords?.length ? `- Keywords: ${orgEnrichment.keywords.join(', ')}` : ''}
`
    : '';

  const competitorSection = (orgEnrichment && competitors && competitors.length > 0)
    ? `\nCompetitor Comparison Data (from Apollo):
Target Company: ${orgEnrichment.name} — ${orgEnrichment.employeeCount?.toLocaleString() ?? 0} employees, ${orgEnrichment.totalFunding || 'N/A'} funding, ${orgEnrichment.annualRevenue || 'N/A'} revenue, founded ${orgEnrichment.foundedYear}
${competitors.map(c => `Competitor: ${c.name} — ${c.employeeCount?.toLocaleString() ?? 0} employees, ${c.totalFunding} funding, ${c.annualRevenue} revenue, founded ${c.foundedYear}`).join('\n')}
`
    : '';

  const competitiveSection = (competitorAiSummary || competitorResults.length > 0 || moatAiSummary)
    ? `\n---\nCompetitive Intelligence (via NimbleWay):\n${
        competitorAiSummary ? `Competitor search AI summary: ${competitorAiSummary}\n` : ''
      }${
        competitorResults.length > 0
          ? `Competitor results:\n${competitorResults.map(c => `- ${c.title}: ${c.description}`).join('\n')}\n`
          : ''
      }${
        moatAiSummary ? `\nMoat/Defensibility research AI summary: ${moatAiSummary}\n` : ''
      }
Given all of this, answer these questions that a VC would ask:
1. Who are the top 3-5 direct competitors?
2. Why can't a large incumbent (like NVIDIA, Google, Microsoft, Amazon) simply build this themselves?
3. What is this company's defensible moat? (network effects, proprietary data, switching costs, technical complexity, regulatory advantage, speed to market)
4. Where is this company vulnerable?
`
    : '';

  const jobPostingsSection = `\nActive Job Postings (${totalJobPostings} found):\n${
    totalJobPostings === 0
      ? 'No active job postings found — flag this as a potential concern about hiring activity.'
      : jobPostings.map(j => `- ${j.title} (${j.country || 'Remote'}, posted ${j.postedAt})`).join('\n')
  }\n`;

  return `Analyze this company website and produce a deal research brief.

Company URL: ${url}
${serpSection}
Website Content:
${markdown.slice(0, 12000)}
${aiPlatformSection}${newsSection}${orgSection}${nimbleNewsSection}${networkSection}${jobPostingsSection}${competitorSection}${competitiveSection}
Respond with this exact JSON structure:
{
  "companyName": "string — the company name",
  "sections": {
    "companyOverview": "string — 2-3 sentences on what the company does",
    "foundingTeam": "string — founders, leadership team, backgrounds if available",
    "product": "string — what they sell, how it works, who buys it",
    "targetMarket": "string — TAM/SAM, customer segments, verticals",
    "competitiveLandscape": "string — who else does this, how they differentiate",
    "redFlags": "string — anything concerning: vague claims, no team info, unclear business model, etc.",
    "glasswingRelevance": "string — how this maps to Glasswing's AI/ML enterprise thesis, investment attractiveness",
    "searchPresence": "string — analysis of Google search presence: do they rank well? Are they running ads? Do they have featured snippets? What do search results reveal about market positioning?",
    "aiConsensus": "string — synthesize what ChatGPT and Perplexity say about this company. Where do they agree? Where do they disagree? What's the overall AI consensus on this company's positioning and potential?",
    "recentEvents": "string — timeline analysis of recent company events from Apollo news data. Key hires, funding rounds, partnerships, product launches. What trajectory do these events suggest? If no news data is available, note that this is a signal the company may be pre-traction or flying under the radar.",
    "newsAndPress": "string — summary of press coverage quality and quantity from recent news search. Are they getting coverage in top-tier outlets? What is the narrative in the press? If no results, note what that implies.",
    "hiringSignal": "string — what the hiring patterns reveal: are they scaling engineering? sales-heavy? building leadership? hiring internationally? What does this signal about growth stage and priorities? If no postings, flag that as a potential concern.",
    "fundingAnalysis": "string — analysis of funding trajectory, investor quality, runway implications, and growth signals based on available data. If no funding data exists, note what that implies for stage and strategy.",
    "techStackAnalysis": "string — what the tech stack reveals about engineering maturity, build-vs-buy decisions, and technical direction. Infer from website and product description if explicit data is unavailable.",
    "networkOpportunity": "string — who are the key people to connect with at this company? Who are notable alumni now at other companies that could provide references or warm intros? What shared backgrounds (same university, same previous employer, same city) might create natural connection points for the Glasswing team?",
    "competitorComparison": "string — side-by-side comparison of this company vs key competitors on employee count, funding stage, and positioning. Use any available data. If competitors cannot be identified, note that.",
    "competitiveMoat": "string — structured analysis: (1) who are the top 3-5 direct competitors, (2) why can't a large incumbent (NVIDIA, Google, Microsoft, Amazon) build this themselves — be specific about technical, data, network, or regulatory barriers, (3) what is this company's defensible moat — name the type (network effects, proprietary data, switching costs, technical complexity, regulatory advantage, speed), (4) where is the company vulnerable. Cite evidence from the research. If competitive intelligence data was unavailable, reason from website content alone and note the limitation."
  },
  "competitors": [{ "name": "string — competitor company name", "url": "string — competitor website if known, empty string if not", "description": "string — one sentence on what they do and how they compare to the target company" }]
}`;
}
