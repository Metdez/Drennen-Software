'use client';
import { useState } from 'react';
import SearchForm from '@/components/SearchForm';
import LoadingState from '@/components/LoadingState';
import ResearchBriefComponent from '@/components/ResearchBrief';
import BriefChat from '@/components/BriefChat';
import type { ResearchBrief, ResearchResponse } from '@/lib/types';

type PageState = 'idle' | 'loading' | 'done';

export default function Home() {
  const [state, setState] = useState<PageState>('idle');
  const [brief, setBrief] = useState<ResearchBrief | null>(null);
  const [activeUrl, setActiveUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleGenerateMemo() {
    // TODO: Implement memo generation logic
    console.log('Generate memo for:', brief?.companyName);
  }

  async function handleSubmit(url: string) {
    setState('loading');
    setActiveUrl(url);
    setError(null);
    setBrief(null);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data: ResearchResponse = await res.json();

      if (data.success && data.brief) {
        setBrief(data.brief);
        setState('done');
      } else {
        setError(data.error ?? 'An unknown error occurred.');
        setState('idle');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
      setState('idle');
    }
  }

  return (
    <main className="min-h-screen py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--accent)' }}
            />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
            >
              Glasswing Ventures
            </span>
          </div>
          <h1
            className="text-3xl font-medium mb-2"
            style={{ fontFamily: 'var(--font-jetbrains)', color: 'var(--text-primary)' }}
          >
            Deal Research
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-sans)' }}
          >
            Paste a company URL to generate an AI-powered research brief.
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-6">
          <SearchForm onSubmit={handleSubmit} isLoading={state === 'loading'} />
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-6 rounded-lg px-4 py-3 text-sm"
            style={{
              background: 'rgba(255,79,79,0.08)',
              border: '1px solid rgba(255,79,79,0.2)',
              color: 'var(--accent-red)',
              fontFamily: 'var(--font-ibm-sans)',
            }}
          >
            {error}
          </div>
        )}

        {/* Loading State */}
        {state === 'loading' && <LoadingState url={activeUrl} />}

        {/* Brief */}
        {state === 'done' && brief && (
          <>
            <ResearchBriefComponent brief={brief} onGenerateMemo={handleGenerateMemo} />
            <BriefChat brief={brief} />
          </>
        )}
      </div>
    </main>
  );
}
