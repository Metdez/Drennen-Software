import { NodeRegistry, ExecutionContext } from '@jam-nodes/core';
import type { NodeDefinition } from '@jam-nodes/core';
import { builtInNodes } from '@jam-nodes/nodes';
import { RESEARCH_SYSTEM_PROMPT, buildUserPrompt } from './prompts';
import type { WorkflowResult, ResearchBrief, NewsArticle, JobPosting, NewsResult, NetworkPerson, OrgEnrichment, CompetitorComparison } from './types';

function mapApolloPersons(people: any[]): NetworkPerson[] {
  return (people ?? []).map((p: any) => ({
    name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim(),
    title: p.title ?? '',
    company: p.organization?.name ?? '',
    linkedinUrl: p.linkedin_url ?? undefined,
    location: [p.city, p.state].filter(Boolean).join(', ') || undefined,
  }));
}

// Initialize the jam-nodes registry once (reused across requests)
const registry = new NodeRegistry();
registry.registerAll(builtInNodes as NodeDefinition[]);

export async function runResearchWorkflow(companyUrl: string): Promise<WorkflowResult> {
  // Create a fresh execution context for each request
  const ctx = new ExecutionContext({ companyUrl });
  const httpExecutor = registry.getExecutor('http_request');
  if (!httpExecutor) {
    return { success: false, error: 'http_request node not found in registry.' };
  }

  // ============================================
  // NODE 1: Scrape the company website via Firecrawl
  // ============================================
  const scrapeResult = await httpExecutor(
    {
      url: 'https://api.firecrawl.dev/v2/scrape',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: {
        url: companyUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      },
      timeout: 30000,
    },
    ctx.toNodeContext('user', 'research-wf')
  );

  if (!scrapeResult.success) {
    return { success: false, error: `Scrape failed: ${scrapeResult.error}` };
  }

  // Store the scrape output in context
  ctx.storeNodeOutput('scrape', scrapeResult.output);

  // Extract the markdown content from Firecrawl response
  const scrapeBody = scrapeResult.output as any;
  const markdown = scrapeBody?.body?.data?.markdown;
  const metadata = scrapeBody?.body?.data?.metadata || {};

  if (!markdown || markdown.length < 100) {
    return { success: false, error: 'Website returned insufficient content to analyze.' };
  }

  // Derive company name for search queries (used by multiple nodes below)
  const companyNameForSearch =
    (metadata.title as string | undefined)?.split(/[—|·\-]/)[0]?.trim() ||
    (() => { try { return new URL(companyUrl).hostname.replace(/^www\./, ''); } catch { return companyUrl; } })();

  // ============================================
  // NODE 2: Google SERP via NimbleWay (optional)
  // ============================================
  let googleSerpMarkdown: string | null = null;

  if (process.env.NIMBLE_API_KEY) {
    try {
      const serpResult = await httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/agents/run',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: {
            agent: 'google_search',
            params: { query: companyNameForSearch },
          },
          timeout: 30000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );

      if (serpResult.success) {
        ctx.storeNodeOutput('googleSerp', serpResult.output);
        const serpBody = serpResult.output as any;
        googleSerpMarkdown = serpBody?.body?.data?.markdown ?? null;
      }
    } catch {
      // NimbleWay failure is non-fatal — continue without SERP data
    }
  }

  // ============================================
  // NODE 3: NimbleWay LLM Agents — ChatGPT + Perplexity (parallel, optional)
  // ============================================
  let chatgptSays: string | undefined;
  let perplexitySays: string | undefined;

  if (process.env.NIMBLE_API_KEY) {
    const nimbleHeaders = {
      'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    const [chatgptResult, perplexityResult] = await Promise.allSettled([
      httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/agents/run',
          method: 'POST',
          headers: nimbleHeaders,
          body: {
            agent: 'chatgpt',
            params: { query: `What is ${companyNameForSearch}? Who are their competitors and what is their market position?` },
          },
          timeout: 45000,
        },
        ctx.toNodeContext('user', 'research-wf')
      ),
      httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/agents/run',
          method: 'POST',
          headers: nimbleHeaders,
          body: {
            agent: 'perplexity',
            params: { query: `What is ${companyNameForSearch}? Who founded it, what do they do, and who are their main competitors?` },
          },
          timeout: 45000,
        },
        ctx.toNodeContext('user', 'research-wf')
      ),
    ]);

    if (chatgptResult.status === 'fulfilled' && chatgptResult.value.success) {
      ctx.storeNodeOutput('chatgptResponse', chatgptResult.value.output);
      chatgptSays = (chatgptResult.value.output as any)?.body?.data?.markdown ?? 'Response unavailable';
    } else {
      chatgptSays = 'Response unavailable';
    }

    if (perplexityResult.status === 'fulfilled' && perplexityResult.value.success) {
      ctx.storeNodeOutput('perplexityResponse', perplexityResult.value.output);
      perplexitySays = (perplexityResult.value.output as any)?.body?.data?.markdown ?? 'Response unavailable';
    } else {
      perplexitySays = 'Response unavailable';
    }
  }

  // ============================================
  // NODE 4: Apollo Org Enrichment (optional — requires APOLLO_API_KEY)
  // ============================================
  let apolloNewsArticles: NewsArticle[] = [];
  let jobPostings: JobPosting[] = [];
  let companyLeadership: NetworkPerson[] = [];
  let companyAlumni: NetworkPerson[] = [];
  let orgEnrichment: OrgEnrichment | undefined;
  let competitorData: CompetitorComparison[] | undefined;

  if (process.env.APOLLO_API_KEY) {
    try {
      const domain = new URL(companyUrl).hostname.replace(/^www\./, '');

      const orgResult = await httpExecutor(
        {
          url: `https://api.apollo.io/api/v1/organizations/enrich?domain=${domain}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'X-Api-Key': process.env.APOLLO_API_KEY,
          },
          timeout: 15000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );

      ctx.storeNodeOutput('orgEnrichment', orgResult.success ? orgResult.output : null);
      const orgBody = orgResult.output as any;
      const org = orgBody?.body?.organization;
      const orgId: string | undefined = org?.id;

      if (org) {
        orgEnrichment = {
          name: org.name ?? '',
          foundedYear: org.founded_year ?? 0,
          industry: org.industry ?? '',
          employeeCount: org.estimated_num_employees ?? 0,
          annualRevenue: org.annual_revenue_printed ?? '',
          totalFunding: org.total_funding_printed ?? '',
          latestFundingStage: org.latest_funding_stage ?? '',
          latestFundingDate: org.latest_funding_round_date ?? '',
          fundingRounds: (org.funding_events ?? []).map((e: any) => ({
            date: e.date ?? '',
            type: e.type ?? '',
            investors: e.investors ?? '',
            amount: e.amount ?? '',
            currency: e.currency ?? '$',
          })),
          techStack: org.technology_names ?? [],
          departmentalHeadcount: org.departmental_head_count ?? {},
          linkedinUrl: org.linkedin_url ?? undefined,
          twitterUrl: org.twitter_url ?? undefined,
          city: org.city ?? undefined,
          state: org.state ?? undefined,
          country: org.country ?? undefined,
          shortDescription: org.short_description ?? undefined,
          keywords: org.keywords ?? undefined,
        };
      }

      if (orgId) {
        // ============================================
        // NODE 5: Apollo News Articles (requires org ID from Node 4)
        // ============================================
        const apolloNewsResult = await httpExecutor(
          {
            url: 'https://api.apollo.io/api/v1/news_articles/search',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Api-Key': process.env.APOLLO_API_KEY,
            },
            body: {
              organization_ids: [orgId],
              per_page: 10,
              page: 1,
            },
            timeout: 15000,
          },
          ctx.toNodeContext('user', 'research-wf')
        );

        ctx.storeNodeOutput('newsArticles', apolloNewsResult.success ? apolloNewsResult.output : null);

        if (apolloNewsResult.success) {
          const newsBody = apolloNewsResult.output as any;
          const rawArticles: any[] = newsBody?.body?.news_articles || [];
          apolloNewsArticles = rawArticles.map((a) => ({
            title: a.title || '',
            url: a.url || '',
            source: a.domain || '',
            snippet: a.snippet || '',
            publishedAt: a.published_at || '',
            categories: a.event_categories || [],
          }));
        }

        // ============================================
        // NODE 6: Apollo Job Postings (requires org ID from Node 4)
        // ============================================
        const jobPostingsResult = await httpExecutor(
          {
            url: `https://api.apollo.io/api/v1/organizations/${orgId}/job_postings?per_page=10`,
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Api-Key': process.env.APOLLO_API_KEY,
            },
            timeout: 15000,
          },
          ctx.toNodeContext('user', 'research-wf')
        );

        ctx.storeNodeOutput('jobPostings', jobPostingsResult.success ? jobPostingsResult.output : null);

        if (jobPostingsResult.success) {
          const jobBody = jobPostingsResult.output as any;
          const rawPostings: any[] = jobBody?.body?.organization_job_postings ?? [];
          jobPostings = rawPostings.map((j) => ({
            title: j.title,
            url: j.url,
            country: j.country ?? undefined,
            postedAt: j.posted_at,
          }));
        }
      }
    } catch {
      // Apollo failures are non-fatal — continue without news/jobs data
    }

    // ============================================
    // NODE 7: Apollo People Search — leadership + alumni (parallel)
    // ============================================
    try {
      const peopleDomain = new URL(companyUrl).hostname.replace(/^www\./, '');
      const apolloPeopleHeaders = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      };

      const [leadershipResult, alumniResult] = await Promise.allSettled([
        httpExecutor(
          {
            url: 'https://api.apollo.io/api/v1/mixed_people/search',
            method: 'POST',
            headers: apolloPeopleHeaders,
            body: {
              api_key: process.env.APOLLO_API_KEY,
              q_organization_domains: [peopleDomain],
              person_titles: ['CEO', 'CTO', 'Founder', 'Co-Founder', 'VP', 'Director', 'Head of'],
              per_page: 10,
            },
            timeout: 30000,
          },
          ctx.toNodeContext('user', 'research-wf')
        ),
        httpExecutor(
          {
            url: 'https://api.apollo.io/api/v1/mixed_people/search',
            method: 'POST',
            headers: apolloPeopleHeaders,
            body: {
              api_key: process.env.APOLLO_API_KEY,
              q_organization_domains: [peopleDomain],
              person_titles: ['Former', 'Ex-'],
              per_page: 5,
            },
            timeout: 30000,
          },
          ctx.toNodeContext('user', 'research-wf')
        ),
      ]);

      if (leadershipResult.status === 'fulfilled' && leadershipResult.value.success) {
        ctx.storeNodeOutput('companyLeadership', leadershipResult.value.output);
        companyLeadership = mapApolloPersons((leadershipResult.value.output as any)?.body?.people);
      }

      if (alumniResult.status === 'fulfilled' && alumniResult.value.success) {
        ctx.storeNodeOutput('companyAlumni', alumniResult.value.output);
        companyAlumni = mapApolloPersons((alumniResult.value.output as any)?.body?.people);
      }
    } catch {
      // People search failure is non-fatal — continue without network data
    }
  }

  // ============================================
  // NODE 8: NimbleWay News Search (optional)
  // ============================================
  let newsResults: NewsResult[] = [];
  let newsAiSummary = '';

  if (process.env.NIMBLE_API_KEY) {
    const nimbleNewsResult = await httpExecutor(
      {
        url: 'https://sdk.nimbleway.com/v1/search',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: {
          query: `${companyNameForSearch} latest news funding`,
          focus: 'news',
          max_results: 5,
          deep_search: false,
          include_answer: true,
          time_range: 'year',
        },
        timeout: 15000,
      },
      ctx.toNodeContext('user', 'research-wf')
    );

    if (nimbleNewsResult.success) {
      ctx.storeNodeOutput('newsSearch', nimbleNewsResult.output);
      const newsBody = nimbleNewsResult.output as any;
      newsAiSummary = newsBody?.body?.answer ?? '';
      const rawResults: any[] = newsBody?.body?.results ?? [];
      newsResults = rawResults.map((r: any): NewsResult => ({
        title: r.title ?? '',
        url: r.url ?? '',
        description: r.description ?? '',
        publishedDate: r.metadata?.published_date,
      }));
    }
    // On failure: silently continue with empty arrays
  }

  // ============================================
  // NODE 9: Competitor Discovery (requires NIMBLE_API_KEY + APOLLO_API_KEY)
  // ============================================
  if (process.env.NIMBLE_API_KEY && process.env.APOLLO_API_KEY) {
    try {
      // 9A: NimbleWay general search for top competitors
      const competitorSearchResult = await httpExecutor(
        {
          url: 'https://sdk.nimbleway.com/v1/search',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NIMBLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: {
            query: `${companyNameForSearch} top competitors alternatives`,
            focus: 'general',
            max_results: 5,
            deep_search: false,
            include_answer: true,
          },
          timeout: 30000,
        },
        ctx.toNodeContext('user', 'research-wf')
      );

      if (competitorSearchResult.success) {
        const searchBody = competitorSearchResult.output as any;
        const searchAnswer: string =
          searchBody?.body?.answer ||
          JSON.stringify((searchBody?.body?.results || []).slice(0, 3));

        if (searchAnswer) {
          // 9B: Ask Claude to extract the top 3 competitor domains
          const domainExtractionResult = await httpExecutor(
            {
              url: 'https://api.anthropic.com/v1/messages',
              method: 'POST',
              headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
              },
              body: {
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 200,
                messages: [
                  {
                    role: 'user',
                    content: `From these search results, extract the domain names of the top 3 direct competitors to ${companyNameForSearch}. Return ONLY a JSON array of domain strings, nothing else. Example: ["competitor1.com", "competitor2.com", "competitor3.com"]\n\nSearch results:\n${searchAnswer}`,
                  },
                ],
              },
              timeout: 15000,
            },
            ctx.toNodeContext('user', 'research-wf')
          );

          if (domainExtractionResult.success) {
            const domainText: string =
              (domainExtractionResult.output as any)?.body?.content?.[0]?.text ?? '';
            try {
              const domains: string[] = JSON.parse(
                domainText.replace(/```json\n?|```\n?/g, '').trim()
              );

              if (Array.isArray(domains) && domains.length > 0) {
                // 9C: Apollo org enrichment for each competitor domain (parallel, max 3)
                const enrichResults = await Promise.allSettled(
                  domains.slice(0, 3).map((domain) =>
                    httpExecutor(
                      {
                        url: `https://api.apollo.io/api/v1/organizations/enrich?domain=${domain}`,
                        method: 'GET',
                        headers: {
                          'Content-Type': 'application/json',
                          'Cache-Control': 'no-cache',
                          'X-Api-Key': process.env.APOLLO_API_KEY!,
                        },
                        timeout: 15000,
                      },
                      ctx.toNodeContext('user', 'research-wf')
                    )
                  )
                );

                ctx.storeNodeOutput('competitors', enrichResults);

                competitorData = enrichResults
                  .map((result, i) => {
                    if (result.status !== 'fulfilled' || !result.value.success) return null;
                    const o = (result.value.output as any)?.body?.organization;
                    if (!o) return null;
                    return {
                      name: o.name || domains[i],
                      domain: o.primary_domain || domains[i],
                      employeeCount: o.estimated_num_employees || 0,
                      annualRevenue: o.annual_revenue_printed || String(o.annual_revenue || 'N/A'),
                      totalFunding: o.total_funding_printed || String(o.total_funding || 'N/A'),
                      latestFundingStage: o.latest_funding_stage || 'N/A',
                      foundedYear: o.founded_year || 0,
                      industry: o.industry || 'N/A',
                    } satisfies CompetitorComparison;
                  })
                  .filter((c): c is CompetitorComparison => c !== null);
              }
            } catch {
              // Domain parsing failed — skip competitor comparison
            }
          }
        }
      }
    } catch {
      // Competitor discovery is non-fatal — continue without comparison data
    }
  }

  // ============================================
  // NODE 10: Analyze with Claude via Anthropic API
  // ============================================
  const analysisResult = await httpExecutor(
    {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: RESEARCH_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: buildUserPrompt(markdown, companyUrl, googleSerpMarkdown, chatgptSays, perplexitySays, apolloNewsArticles, orgEnrichment, jobPostings, jobPostings.length, newsAiSummary, newsResults, companyLeadership, companyAlumni, competitorData),
          },
        ],
      },
      timeout: 45000,
    },
    ctx.toNodeContext('user', 'research-wf')
  );

  if (!analysisResult.success) {
    return { success: false, error: `Analysis failed: ${analysisResult.error}` };
  }

  // Store analysis output in context
  ctx.storeNodeOutput('analysis', analysisResult.output);

  // Parse Claude's JSON response
  const analysisBody = analysisResult.output as any;
  const responseText = analysisBody?.body?.content?.[0]?.text;

  if (!responseText) {
    return { success: false, error: 'Claude returned an empty response.' };
  }

  try {
    // Strip any accidental markdown backticks Claude might add
    const cleanJson = responseText.replace(/```json\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const brief: ResearchBrief = {
      companyName: parsed.companyName || 'Unknown',
      companyUrl: companyUrl,
      scrapedAt: new Date().toISOString(),
      sections: {
        companyOverview: parsed.sections?.companyOverview || 'Not available',
        foundingTeam: parsed.sections?.foundingTeam || 'Not available',
        product: parsed.sections?.product || 'Not available',
        targetMarket: parsed.sections?.targetMarket || 'Not available',
        competitiveLandscape: parsed.sections?.competitiveLandscape || 'Not available',
        redFlags: parsed.sections?.redFlags || 'Not available',
        glasswingRelevance: parsed.sections?.glasswingRelevance || 'Not available',
        searchPresence: parsed.sections?.searchPresence || 'Not available',
        aiConsensus: parsed.sections?.aiConsensus || 'Not available',
        recentEvents: parsed.sections?.recentEvents || 'Not available',
        newsAndPress: parsed.sections?.newsAndPress || 'Not available',
        hiringSignal: parsed.sections?.hiringSignal || 'Not available',
        fundingAnalysis: parsed.sections?.fundingAnalysis || 'Not available',
        techStackAnalysis: parsed.sections?.techStackAnalysis || 'Not available',
        networkOpportunity: parsed.sections?.networkOpportunity || 'Not available',
        competitorComparison: parsed.sections?.competitorComparison || 'Not available',
        competitiveMoat: parsed.sections?.competitiveMoat || 'Not available',
      },
      metadata: {
        pageTitle: metadata.title || '',
        pageDescription: metadata.description || '',
        sourceUrl: metadata.sourceURL || companyUrl,
      },
      chatgptSays,
      perplexitySays,
      apolloNewsArticles,
      jobPostings,
      totalJobPostings: jobPostings.length,
      newsResults,
      newsAiSummary,
      companyLeadership,
      companyAlumni,
      orgEnrichment,
      competitorData,
    };

    return { success: true, brief };
  } catch (parseError) {
    return { success: false, error: `Failed to parse Claude response as JSON: ${responseText.slice(0, 200)}` };
  }
}
