import type { Metadata } from 'next';
import { searchFromParams } from '@/lib/search/unified';
import { computeSearchFacets } from '@/lib/search/facets';
import { SearchBar } from '@/components/search/SearchBar';
import { SearchFilters } from '@/components/search/SearchFilters';
import { EntitySearchCard } from '@/components/search/EntitySearchCard';
import { PaperSearchCard } from '@/components/search/PaperSearchCard';
import { TopicCloud } from '@/components/search/TopicCloud';
import { DateRangeFilter } from '@/components/search/DateRangeFilter';
import { SearchPagination } from '@/components/search/SearchPagination';
import { NoResults } from '@/components/search/NoResults';
import type { SearchQuery, SearchResultItem } from '@/lib/search/types';

// ────────────────────────────────────────────────────────────
// Metadata
// ────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';

  if (q) {
    return {
      title: `"${q}" results`,
      description: `Search results for "${q}" across think tanks, donors, policy papers, and legislation.`,
      openGraph: {
        title: `"${q}" — Search | Think Tank Influence Tracker`,
        description: `Search results for "${q}" across think tanks, donors, policy papers, and legislation.`,
      },
    };
  }

  return {
    title: 'Search & Discovery',
    description:
      'Explore think tanks, donors, policy papers, and legislation. Follow the money from donors to policy.',
    robots: {
      index: false,
      follow: true,
    },
  };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function toStr(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? '';
  return val ?? '';
}

function chamberBadge(chamber: string | null | undefined) {
  if (!chamber) return null;
  const label = chamber.charAt(0).toUpperCase() + chamber.slice(1);
  const color =
    chamber.toLowerCase() === 'senate'
      ? 'bg-blue-900/60 text-blue-300'
      : 'bg-emerald-900/60 text-emerald-300';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ────────────────────────────────────────────────────────────
// Result cards for inline types
// ────────────────────────────────────────────────────────────

function LegislationCard({ item }: { item: Extract<SearchResultItem, { kind: 'legislation' }> }) {
  const { legislation, linkedEntities } = item;
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <h3 className="font-serif text-lg font-semibold text-gray-100">
        {legislation.title}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {chamberBadge(legislation.chamber)}
        {legislation.congress_number && (
          <span className="font-mono text-xs text-gray-500">
            {legislation.congress_number}th Congress
          </span>
        )}
        {legislation.bill_id && (
          <span className="font-mono text-xs text-gray-400">
            {legislation.bill_id.toUpperCase()}
          </span>
        )}
      </div>
      {linkedEntities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {linkedEntities.map((e) => (
            <a
              key={e.slug}
              href={`/entity/${e.slug}`}
              className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:text-gray-100"
            >
              {e.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function DonorCard({ item }: { item: Extract<SearchResultItem, { kind: 'donor' }> }) {
  const { donorName, totalAmount, topRecipients } = item;
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
      <h3 className="font-serif text-lg font-semibold text-gray-100">{donorName}</h3>
      <p className="mt-1 font-mono text-sm text-amber-400">
        {formatCurrency(totalAmount)} total
      </p>
      {topRecipients.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Top Recipients
          </p>
          {topRecipients.slice(0, 5).map((r) => (
            <div key={r.slug} className="flex items-center justify-between text-sm">
              <a
                href={`/entity/${r.slug}`}
                className="text-gray-300 transition-colors hover:text-gray-100"
              >
                {r.name}
              </a>
              <span className="font-mono text-xs text-gray-500">
                {formatCurrency(r.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Result renderer
// ────────────────────────────────────────────────────────────

function ResultCard({ item }: { item: SearchResultItem }) {
  switch (item.kind) {
    case 'entity':
      return <EntitySearchCard result={item} />;
    case 'paper':
      return <PaperSearchCard result={item} />;
    case 'legislation':
      return <LegislationCard item={item} />;
    case 'donor':
      return <DonorCard item={item} />;
  }
}

// ────────────────────────────────────────────────────────────
// Page component
// ────────────────────────────────────────────────────────────

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = toStr(params.q);

  // ── With query: search results view ────────────────────────
  if (q) {
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) urlParams.append(key, v);
      } else {
        urlParams.set(key, value);
      }
    }

    const response = await searchFromParams(urlParams);

    const currentFilters: SearchQuery = {
      q,
      type: (toStr(params.type) || undefined) as SearchQuery['type'],
      topics: params.topics
        ? Array.isArray(params.topics)
          ? params.topics
          : [params.topics]
        : [],
      verdict: (toStr(params.verdict) || undefined) as SearchQuery['verdict'],
      dateFrom: toStr(params.dateFrom) || undefined,
      dateTo: toStr(params.dateTo) || undefined,
    };

    return (
      <main className="min-h-screen bg-gray-950 text-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Search bar */}
          <SearchBar initialQuery={q} />

          {/* Active filters */}
          <div className="mt-4">
            <SearchFilters facets={response.facets} currentFilters={currentFilters} />
          </div>

          {/* Main grid */}
          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Results column */}
            <div className="lg:col-span-3">
              {response.results.length > 0 ? (
                <div className="space-y-4">
                  {response.results.map((item, idx) => (
                    <ResultCard key={`${item.kind}-${idx}`} item={item} />
                  ))}
                </div>
              ) : (
                <NoResults query={q} />
              )}

              {/* Pagination */}
              {response.totalCount > 0 && (
                <div className="mt-8">
                  <SearchPagination
                    page={response.page}
                    pageSize={response.pageSize}
                    totalCount={response.totalCount}
                  />
                </div>
              )}

              {/* Timing footer */}
              <p className="mt-4 text-xs text-gray-600">
                Found{' '}
                <span className="font-mono">{response.totalCount.toLocaleString()}</span>{' '}
                result{response.totalCount !== 1 ? 's' : ''} in{' '}
                <span className="font-mono">{response.timing.totalMs}ms</span>
              </p>
            </div>

            {/* Sidebar */}
            <aside className="hidden space-y-6 lg:block">
              <TopicCloud
                topics={response.facets.topics}
                selectedTopics={currentFilters.topics ?? []}
              />
              <DateRangeFilter
                years={response.facets.years}
                currentFrom={toStr(params.from)}
                currentTo={toStr(params.to)}
              />

              {/* Facet summary */}
              <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
                <h4 className="text-sm font-medium uppercase tracking-wider text-gray-400">
                  Result Breakdown
                </h4>
                <ul className="mt-3 space-y-1.5">
                  {response.facets.entityTypes.map((f) => (
                    <li key={f.type} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-300">{f.type.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-xs text-gray-500">{f.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  // ── Without query: landing / browse state ──────────────────
  const globalFacets = await computeSearchFacets('', {});

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <SearchBar />

        <div className="mt-12 text-center">
          <h1 className="font-serif text-4xl font-bold tracking-tight text-gray-100">
            Search &amp; Discovery
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-gray-400">
            Explore think tanks, donors, policy papers, and legislation
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl">
          <TopicCloud topics={globalFacets.topics} selectedTopics={[]} />
        </div>
      </div>
    </main>
  );
}
