'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-gray-100">
            Something went wrong
          </h1>
          <p className="text-gray-400 text-lg">
            An unexpected error occurred. Our team has been notified.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors font-medium"
          >
            Go home
          </Link>
        </div>

        <p className="text-gray-500 text-sm pt-2">
          If this keeps happening,{' '}
          <a
            href="https://github.com/think-tank-tracker/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            report it on GitHub
          </a>
          .
        </p>
      </div>
    </div>
  );
}
