'use client';

import Link from 'next/link';

const TRACKED_ENTITIES = [
  { name: 'Heritage Foundation', slug: 'heritage-foundation' },
  { name: 'Brookings Institution', slug: 'brookings-institution' },
  { name: 'Center for American Progress', slug: 'center-for-american-progress' },
  { name: 'Cato Institute', slug: 'cato-institute' },
  { name: 'Council on Foreign Relations', slug: 'council-on-foreign-relations' },
  { name: 'Atlantic Council', slug: 'atlantic-council' },
];

export default function SearchError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-gray-100">
            Search temporarily unavailable
          </h1>
          <p className="text-gray-400 text-lg">
            We&apos;re having trouble processing searches right now. You can
            browse tracked entities directly.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            Try again
          </button>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-left space-y-3">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Browse tracked entities
          </h2>
          <ul className="space-y-2">
            {TRACKED_ENTITIES.map((entity) => (
              <li key={entity.slug}>
                <Link
                  href={`/entity/${entity.slug}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {entity.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          className="inline-block text-gray-400 hover:text-gray-200 transition-colors font-medium"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
