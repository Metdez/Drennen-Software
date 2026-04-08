import React from 'react';

interface SourceLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'className'> {
  url: string | null;
  label?: string;
}

export function SourceLink({ url, label, ...rest }: SourceLinkProps) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
      {...rest}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3 w-3 shrink-0"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M4.22 11.78a.75.75 0 0 1 0-1.06L9.44 5.5H5.75a.75.75 0 0 1 0-1.5h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0V6.56l-5.22 5.22a.75.75 0 0 1-1.06 0Z"
          clipRule="evenodd"
        />
      </svg>
      {label && <span>{label}</span>}
    </a>
  );
}
