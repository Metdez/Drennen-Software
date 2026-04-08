import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 text-center max-w-md mx-auto">
      {icon && (
        <div className="flex justify-center mb-4 text-gray-500">{icon}</div>
      )}
      <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium text-sm"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
