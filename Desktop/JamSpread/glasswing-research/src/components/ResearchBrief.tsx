import { ResearchBrief as ResearchBriefType } from '@/lib/types';
import BriefSection from './BriefSection';

interface Props {
  brief: ResearchBriefType;
  onGenerateMemo: () => void;
}

export default function ResearchBrief({ brief, onGenerateMemo }: Props) {
  const date = new Date(brief.scrapedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h2
          className="text-2xl font-medium mb-1"
          style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--text-primary)' }}
        >
          {brief.companyName}
        </h2>
        <div className="flex items-center gap-3">
          <a
            href={brief.companyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline truncate"
            style={{ color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)' }}
          >
            {brief.companyUrl}
          </a>
          <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>·</span>
          <span
            className="text-xs"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
          >
            {date}
          </span>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-3">
        <BriefSection title="Company Overview" content={brief.sections.companyOverview} icon="◈" />
        <BriefSection title="Founding Team" content={brief.sections.foundingTeam} icon="◈" />
        <BriefSection title="Product" content={brief.sections.product} icon="◈" />
        <BriefSection title="Target market" content={brief.sections.targetMarket} icon="◈" />
        <BriefSection title="Competitive Landscape" content={brief.sections.competitiveLandscape} icon="◈" />
        <BriefSection title="Search Presence" content={brief.sections.searchPresence} icon="◈" />
        <BriefSection title="Red Flags" content={brief.sections.redFlags} icon="⚠" variant="warning" />
        <BriefSection title="Glasswing Relevance" content={brief.sections.glasswingRelevance} icon="◆" variant="positive" />
        <BriefSection title="AI Platform Consensus" content={brief.sections.aiConsensus} icon="◈" variant="positive" />

        {/* Competitor Comparison */}
        {brief.competitorData && brief.competitorData.length > 0 && (
          <BriefSection title="Competitor Comparison" content={brief.sections.competitorComparison} icon="◈">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-[11px] border-collapse" style={{ fontFamily: 'var(--font-ibm-mono)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Company', 'Employees', 'Funding', 'Revenue', 'Stage', 'Founded'].map((h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 uppercase tracking-widest font-normal"
                        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)', fontSize: '9px' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Target company row — highlighted */}
                  {brief.orgEnrichment && (
                    <tr
                      className="rounded"
                      style={{ background: 'rgba(79,140,255,0.08)', borderBottom: '1px solid rgba(79,140,255,0.2)' }}
                    >
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--accent-blue)' }}>
                        {brief.companyName}
                        <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(79,140,255,0.15)', color: 'var(--accent-blue)' }}>you</span>
                      </td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.employeeCount > 0 ? brief.orgEnrichment.employeeCount.toLocaleString() : 'N/A'}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.totalFunding || 'N/A'}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.annualRevenue || 'N/A'}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.latestFundingStage || 'N/A'}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{brief.orgEnrichment.foundedYear > 0 ? brief.orgEnrichment.foundedYear : 'N/A'}</td>
                    </tr>
                  )}
                  {/* Competitor rows */}
                  {brief.competitorData.map((c, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.employeeCount > 0 ? c.employeeCount.toLocaleString() : 'N/A'}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.totalFunding}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.annualRevenue}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.latestFundingStage}</td>
                      <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{c.foundedYear > 0 ? c.foundedYear : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </BriefSection>
        )}

        {/* Funding & Financials */}
        {brief.orgEnrichment && (
          <BriefSection
            title="Funding & Financials"
            content={brief.sections.fundingAnalysis}
            icon="◈"
            variant="positive"
          >
            {/* Stat pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {brief.orgEnrichment.employeeCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-mono)' }}>
                  {brief.orgEnrichment.employeeCount.toLocaleString()} employees
                </span>
              )}
              {brief.orgEnrichment.totalFunding && (
                <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', fontFamily: 'var(--font-ibm-mono)' }}>
                  ${brief.orgEnrichment.totalFunding} raised
                </span>
              )}
              {brief.orgEnrichment.latestFundingStage && (
                <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-mono)' }}>
                  {brief.orgEnrichment.latestFundingStage}
                </span>
              )}
              {brief.orgEnrichment.annualRevenue && (
                <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-mono)' }}>
                  ${brief.orgEnrichment.annualRevenue} ARR
                </span>
              )}
              {brief.orgEnrichment.foundedYear > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
                  est. {brief.orgEnrichment.foundedYear}
                </span>
              )}
            </div>
            {/* Funding timeline */}
            {brief.orgEnrichment.fundingRounds.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Funding History</span>
                {brief.orgEnrichment.fundingRounds.map((round, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <span className="shrink-0 w-16 text-[10px] pt-0.5" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
                      {round.date ? new Date(round.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'}
                    </span>
                    <span className="shrink-0 px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent-green)', borderColor: 'var(--accent-green)', fontFamily: 'var(--font-jetbrains)' }}>
                      {round.type}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}>{round.currency}{round.amount}</span>
                      {round.investors && (
                        <span className="text-[10px] truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}>{round.investors}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </BriefSection>
        )}

        {/* Tech Stack & Engineering */}
        {brief.orgEnrichment && (
          <BriefSection title="Tech Stack & Engineering" content={brief.sections.techStackAnalysis} icon="◈">
            {/* Tech pills */}
            {brief.orgEnrichment.techStack.length > 0 && (
              <div className="mb-4">
                <span className="block text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Technology Stack</span>
                <div className="flex flex-wrap gap-1.5">
                  {brief.orgEnrichment.techStack.map((tech, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px]" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Departmental headcount bars */}
            {Object.keys(brief.orgEnrichment.departmentalHeadcount).length > 0 && (() => {
              const entries = Object.entries(brief.orgEnrichment!.departmentalHeadcount).sort(([, a], [, b]) => b - a);
              const max = entries[0]?.[1] ?? 1;
              return (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}>Department Headcount</span>
                  {entries.map(([dept, count]) => (
                    <div key={dept} className="flex items-center gap-2 text-[10px]">
                      <span className="w-28 shrink-0 capitalize" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{dept.replace(/_/g, ' ')}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${(count / max) * 100}%`, background: 'var(--accent)' }} />
                      </div>
                      <span className="w-8 text-right shrink-0" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>{count}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </BriefSection>
        )}

        {/* Network & Warm Intros */}
        <BriefSection title="Network & Warm Intros" content={brief.sections.networkOpportunity} icon="◈" variant="positive" />

        {(brief.companyLeadership && brief.companyLeadership.length > 0) || (brief.companyAlumni && brief.companyAlumni.length > 0) ? (
          <div className="flex flex-col gap-2">
            {brief.companyLeadership && brief.companyLeadership.length > 0 && (
              <details
                className="rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <summary
                  className="px-5 py-3 cursor-pointer text-xs uppercase tracking-widest select-none"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
                >
                  ▸ Current Leadership ({brief.companyLeadership.length})
                </summary>
                <ul className="px-5 pb-4 flex flex-col gap-2">
                  {brief.companyLeadership.map((person, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-ibm-sans)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{person.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>·</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{person.title}</span>
                      {person.location && (
                        <>
                          <span style={{ color: 'var(--text-secondary)' }}>·</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{person.location}</span>
                        </>
                      )}
                      {person.linkedinUrl && (
                        <a
                          href={person.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)' }}
                          title="LinkedIn"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {brief.companyAlumni && brief.companyAlumni.length > 0 && (
              <details
                className="rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <summary
                  className="px-5 py-3 cursor-pointer text-xs uppercase tracking-widest select-none"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
                >
                  ▸ Alumni Network ({brief.companyAlumni.length})
                </summary>
                <ul className="px-5 pb-4 flex flex-col gap-2">
                  {brief.companyAlumni.map((person, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'var(--font-ibm-sans)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{person.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>·</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{person.title} at {person.company}</span>
                      {person.linkedinUrl && (
                        <a
                          href={person.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--accent)' }}
                          title="LinkedIn"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ) : null}

        {/* Recent Events — Claude's analysis */}
        <BriefSection title="Recent Events" content={brief.sections.recentEvents} icon="◈" />

        {/* Hiring Signal — Claude's analysis of job postings */}
        <BriefSection title="Hiring Signal" content={brief.sections.hiringSignal} icon="◈" />

        {/* Active Job Postings list */}
        {brief.jobPostings && brief.jobPostings.length > 0 && (() => {
          const eng = ['engineer', 'developer', 'dev', 'architect', 'sre', 'devops', 'backend', 'frontend', 'fullstack', 'software', 'data', 'ml', 'ai'];
          const sales = ['sales', 'account', 'ae', 'sdr', 'bdr', 'revenue', 'business development', 'customer success'];
          const lead = ['vp', 'vice president', 'director', 'head of', 'chief', 'cto', 'ceo', 'coo', 'cfo', 'president'];
          const categorize = (title: string) => {
            const t = title.toLowerCase();
            if (lead.some(k => t.includes(k))) return 'Leadership';
            if (eng.some(k => t.includes(k))) return 'Engineering';
            if (sales.some(k => t.includes(k))) return 'Sales';
            return 'Other';
          };
          const groups: Record<string, number> = {};
          brief.jobPostings!.forEach(j => {
            const cat = categorize(j.title);
            groups[cat] = (groups[cat] || 0) + 1;
          });
          const groupOrder = ['Engineering', 'Sales', 'Leadership', 'Other'];
          const summary = groupOrder.filter(g => groups[g]).map(g => `${groups[g]} ${g}`).join(' · ');
          return (
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm">◈</span>
                <h3
                  className="text-xs uppercase tracking-widest"
                  style={{ color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}
                >
                  Active Job Postings
                </h3>
                <span
                  className="ml-auto text-[10px] px-2 py-0.5 rounded"
                  style={{ background: 'rgba(79,140,255,0.1)', color: 'var(--accent)', fontFamily: 'var(--font-ibm-mono)' }}
                >
                  {brief.totalJobPostings}
                </span>
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}>
                {summary}
              </p>
              <ul className="flex flex-col gap-1.5">
                {brief.jobPostings!.map((job, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-xs">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline leading-snug"
                      style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}
                    >
                      {job.title}
                    </a>
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)', fontSize: '10px', flexShrink: 0 }}>
                      {job.country || 'Remote'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {/* Apollo News Timeline */}
        {brief.apolloNewsArticles && brief.apolloNewsArticles.length > 0 && (
          <div
            className="rounded-xl px-5 py-4 flex flex-col gap-3"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
            >
              Apollo News Feed
            </span>
            <div className="flex flex-col gap-3">
              {brief.apolloNewsArticles.map((article, i) => {
                const categoryColors: Record<string, string> = {
                  hires: 'var(--accent-blue)',
                  investment: 'var(--accent-green)',
                  contract: '#f59e0b',
                  partnership: '#a78bfa',
                  product_launch: 'var(--accent-green)',
                  expansion: 'var(--accent-blue)',
                  acquisition: '#f97316',
                };
                const color = article.categories[0]
                  ? (categoryColors[article.categories[0]] ?? 'var(--text-secondary)')
                  : 'var(--text-secondary)';
                const formattedDate = article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—';

                return (
                  <div key={i} className="flex items-start gap-3">
                    {/* Date */}
                    <span
                      className="shrink-0 text-[10px] w-16 pt-0.5"
                      style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
                    >
                      {formattedDate}
                    </span>

                    {/* Category pill */}
                    {article.categories[0] && (
                      <span
                        className="shrink-0 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border"
                        style={{ color, borderColor: color, fontFamily: 'var(--font-jetbrains)' }}
                      >
                        {article.categories[0].replace('_', ' ')}
                      </span>
                    )}

                    {/* Title + source */}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs leading-snug hover:underline"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}
                      >
                        {article.title}
                      </a>
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
                      >
                        {article.source}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(brief.chatgptSays || brief.perplexitySays) && (
          <div className="flex flex-col gap-2">
            {brief.chatgptSays && (
              <details
                className="rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <summary
                  className="px-5 py-3 cursor-pointer text-xs uppercase tracking-widest select-none"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
                >
                  ▸ What ChatGPT says
                </summary>
                <pre
                  className="px-5 pb-4 text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}
                >
                  {brief.chatgptSays}
                </pre>
              </details>
            )}
            {brief.perplexitySays && (
              <details
                className="rounded-xl"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <summary
                  className="px-5 py-3 cursor-pointer text-xs uppercase tracking-widest select-none"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
                >
                  ▸ What Perplexity says
                </summary>
                <pre
                  className="px-5 pb-4 text-xs leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-ibm-sans)' }}
                >
                  {brief.perplexitySays}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Investment Memo CTA */}
      <div className="mt-8 mb-2">
        <button
          onClick={onGenerateMemo}
          className="w-full py-3 px-6 text-white font-bold uppercase tracking-widest rounded transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            background: 'var(--accent)',
            fontFamily: 'var(--font-jetbrains)',
            fontSize: '0.8rem',
          }}
        >
          Generate Investment Memo →
        </button>
        <p
          className="text-center text-xs mt-2"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
        >
          First-draft VC memo · powered by Claude
        </p>
      </div>

      {/* Footer */}
      <p
        className="mt-6 text-xs text-center"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
      >
        Powered by SpreadJam (jam-nodes) · Firecrawl · Claude · NimbleWay · Apollo
      </p>
    </div>
  );
}
