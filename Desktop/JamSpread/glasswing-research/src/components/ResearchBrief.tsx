import { ResearchBrief as ResearchBriefType } from '@/lib/types';
import BriefSection from './BriefSection';

interface Props {
  brief: ResearchBriefType;
}

export default function ResearchBrief({ brief }: Props) {
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
        <BriefSection title="Red Flags" content={brief.sections.redFlags} icon="⚠" variant="warning" />
        <BriefSection title="Glasswing Relevance" content={brief.sections.glasswingRelevance} icon="◆" variant="positive" />
      </div>

      {/* Footer */}
      <p
        className="mt-6 text-xs text-center"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
      >
        Powered by SpreadJam (jam-nodes) · Firecrawl · Claude
      </p>
    </div>
  );
}
