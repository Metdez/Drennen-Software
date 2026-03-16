import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { MemoResponse, ResearchBrief } from '@/lib/types';

export const maxDuration = 60;

// Brief is intentionally permissive — full ResearchBrief validation would duplicate the schema
const requestSchema = z.object({
  brief: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request): Promise<NextResponse<MemoResponse>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Missing brief in request body' }, { status: 400 });
  }

  const brief = parsed.data.brief as unknown as ResearchBrief;
  const companyName = brief.companyName ?? 'the company';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  // Build a bounded research summary instead of serializing the full brief object.
  // Raw brief objects can exceed 50k chars once Apollo articles and AI responses are included.
  const researchSummary = JSON.stringify({
    companyName: brief.companyName,
    companyUrl: brief.companyUrl,
    sections: brief.sections,
    orgEnrichment: brief.orgEnrichment,
    apolloNewsArticles: (brief.apolloNewsArticles ?? []).slice(0, 10),
    chatgptSays: brief.chatgptSays?.slice(0, 1500),
    perplexitySays: brief.perplexitySays?.slice(0, 1500),
  });

  const userContent = `Write an investment memo for ${companyName} based on this research data: ${researchSummary}.

Format the memo with these sections:
1. EXECUTIVE SUMMARY (2-3 sentences — what they do and why it matters)
2. COMPANY OVERVIEW (product, market, business model)
3. TEAM (who's running it, notable backgrounds)
4. MARKET OPPORTUNITY (TAM, growth drivers, timing)
5. COMPETITIVE LANDSCAPE (who else, moat analysis)
6. TRACTION & METRICS (funding, revenue, employees, growth signals)
7. KEY RISKS (red flags, concerns, open questions)
8. GLASSWING FIT (thesis alignment, value-add opportunities, network leverage)
9. RECOMMENDATION (proceed to partner meeting / pass / needs more diligence)

Be honest and data-driven. If data is missing, call it out as an open question that needs follow-up.`;

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system:
          'You are a senior associate at Glasswing Ventures writing an internal investment memo. Glasswing invests in AI/ML enterprise startups. Write in a professional but concise VC style. Use specific data points from the research. The memo should be something a partner could read before an investment committee meeting.',
        messages: [{ role: 'user', content: userContent }],
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error calling Anthropic API';
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return NextResponse.json(
      { success: false, error: `Anthropic API error ${response.status}: ${text}` },
      { status: 502 }
    );
  }

  const data = await response.json() as { content: Array<{ type: string; text: string }> };
  const memo = data.content?.find((c) => c.type === 'text')?.text ?? '';

  if (!memo) {
    return NextResponse.json({ success: false, error: 'Empty response from Anthropic' }, { status: 502 });
  }

  return NextResponse.json({ success: true, memo });
}