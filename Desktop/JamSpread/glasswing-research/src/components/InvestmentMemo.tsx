'use client';

import { useState } from 'react';

interface InvestmentMemoProps {
  memo: string;
  onBack: () => void;
}

export default function InvestmentMemo({ memo, onBack }: InvestmentMemoProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  };

  const lines = memo.split('\n');

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-16">
      {/* Top bar */}
      <div
        className="flex items-center justify-between py-4 mb-6"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={onBack}
          className="text-sm transition-colors"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
        >
          ← Back to Brief
        </button>
        <button
          onClick={handleCopy}
          className="text-sm px-3 py-1.5 rounded transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-jetbrains)',
          }}
        >
          {copied ? '✓ Copied' : copyFailed ? 'Copy failed — use Ctrl+C' : 'Copy to Clipboard'}
        </button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <p
          className="text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}
        >
          Investment Memo · Glasswing Ventures
        </p>
        <h1
          className="text-2xl font-medium mb-1"
          style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--text-primary)' }}
        >
          Internal Deal Memo
        </h1>
        <p
          className="text-xs"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
        >
          First draft ·{' '}
          {new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Memo body */}
      <div className="flex flex-col gap-1">
        {lines.map((line, i) => {
          const trimmed = line.trim();

          if (!trimmed) {
            return <div key={i} className="h-3" />;
          }

          // Strip markdown bold markers and trailing punctuation to normalize for header detection
          const normalized = trimmed
            .replace(/\*\*/g, '')    // strip all markdown bold markers
            .replace(/[:\s]+$/, '')  // remove trailing colon or whitespace
            .trim();

          // Section headers: "1. EXECUTIVE SUMMARY" or bare "EXECUTIVE SUMMARY"
          const isSectionHeader =
            /^\d+\.\s+[A-Z][A-Z\s&]+$/.test(normalized) ||
            /^[A-Z][A-Z\s&]{4,}$/.test(normalized);

          if (isSectionHeader) {
            return (
              <div key={i} className="pt-6 pb-1">
                <h2
                  className="text-xs font-bold uppercase tracking-widest pb-2"
                  style={{
                    color: 'var(--accent)',
                    fontFamily: 'var(--font-jetbrains)',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {normalized.replace(/^\d+\.\s+/, '')}
                </h2>
              </div>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            return (
              <p
                key={i}
                className="text-sm leading-relaxed pl-4"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
              >
                {trimmed}
              </p>
            );
          }

          // Regular body text
          return (
            <p
              key={i}
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
            >
              {trimmed}
            </p>
          );
        })}
      </div>
    </div>
  );
}
