import { buildEntityProfile } from '@/lib/profiles/builder';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ProfileHeader } from '@/components/ProfileHeader';
import { VerdictCard } from '@/components/VerdictCard';
import { DonorTable } from '@/components/DonorTable';
import { LegislationLinks } from '@/components/LegislationLinks';
import { DynamicMiniSankey as MiniSankey, DynamicMiniNetwork as MiniNetwork } from '@/components/viz/DynamicViz';
import { generateEntityMetadata } from '@/lib/seo/entity-metadata';

const FinancialChart = dynamic(
  () => import('@/components/FinancialChart').then(mod => mod.FinancialChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 bg-gray-900 rounded-lg animate-pulse" />
    ),
  }
);

const ConnectionGraph = dynamic(
  () => import('@/components/ConnectionGraph').then(mod => mod.ConnectionGraph),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-900 rounded-lg animate-pulse" />
    ),
  }
);

const PolicyTimeline = dynamic(
  () => import('@/components/PolicyTimeline').then(mod => mod.PolicyTimeline),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-gray-900 rounded-lg animate-pulse" />
    ),
  }
);

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export { generateEntityMetadata as generateMetadata };

const sections = [
  { id: 'verdict', label: 'Verdict' },
  { id: 'financials', label: 'Financials' },
  { id: 'money-flow', label: 'Money Flow' },
  { id: 'donors', label: 'Donors' },
  { id: 'influence-network', label: 'Influence Network' },
  { id: 'policy', label: 'Policy' },
  { id: 'legislation', label: 'Legislation' },
  { id: 'connections', label: 'Connections' },
];

export default async function EntityProfilePage({ params }: Props) {
  const { slug } = await params;
  const profile = await buildEntityProfile(slug);
  if (!profile) notFound();

  return (
    <main id="main-content" className="min-h-screen bg-gray-950 text-gray-100">
      <ProfileHeader entity={profile.entity} verdict={profile.verdict} meta={profile.meta} />

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-12">
        {/* Sticky section nav */}
        <nav className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur -mx-4 px-4 py-3 border-b border-gray-800 flex items-center gap-6 overflow-x-auto">
          {sections.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className="text-sm text-gray-400 hover:text-white whitespace-nowrap transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Verdict — the headline finding */}
        <section id="verdict">
          <VerdictCard verdict={profile.verdict} entity={profile.entity} />
        </section>

        {/* Financial overview */}
        <section id="financials">
          <h2 className="text-2xl font-serif text-gray-100 mb-6">Financial Overview</h2>
          <FinancialChart financials={profile.financials} entityName={profile.entity.name} />
        </section>

        {/* Money flow visualization */}
        <section id="money-flow">
          <h2 className="text-2xl font-serif text-gray-100 mb-6">Money Flow</h2>
          <MiniSankey entityId={profile.entity.id} entitySlug={profile.entity.slug} />
        </section>

        {/* Who funds them */}
        <section id="donors">
          <h2 className="text-2xl font-serif text-gray-100 mb-6">Donor Breakdown</h2>
          <DonorTable donations={profile.donations} summary={profile.donationSummary} />
        </section>

        {/* Influence network visualization */}
        <section id="influence-network">
          <h2 className="text-2xl font-serif text-gray-100 mb-6">Influence Network</h2>
          <MiniNetwork entityId={profile.entity.id} entitySlug={profile.entity.slug} />
        </section>

        {/* What they produce */}
        <section id="policy">
          <h2 className="text-2xl font-serif text-gray-100 mb-6">Policy Output</h2>
          <PolicyTimeline papers={profile.policyPapers} />
        </section>

        {/* What legislation connects */}
        <section id="legislation">
          <h2 className="text-2xl font-serif text-gray-100 mb-6">Connected Legislation</h2>
          <LegislationLinks legislation={profile.legislation} />
        </section>

        {/* Network visualization */}
        <section id="connections">
          <h2 className="text-2xl font-serif text-gray-100 mb-6">Connection Map</h2>
          <ConnectionGraph
            entity={profile.entity}
            donations={profile.donations}
            politicianConnections={profile.politicianConnections}
            policyPapers={profile.policyPapers}
          />
        </section>
      </div>
    </main>
  );
}
