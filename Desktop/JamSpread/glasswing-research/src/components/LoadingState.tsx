'use client';
import { useEffect, useState } from 'react';

const STEPS = [
  { label: 'Scraping website...', delay: 0 },
  { label: 'Running AI analysis...', delay: 3000 },
  { label: 'Generating brief...', delay: 8000 },
];

interface Props {
  url: string;
}

export default function LoadingState({ url }: Props) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.slice(1).map((step, i) =>
      setTimeout(() => setActiveStep(i + 1), step.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="w-full rounded-xl p-6"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: 'var(--accent)' }}
        />
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains)' }}
        >
          Analyzing
        </span>
      </div>
      <p
        className="text-sm mb-5 truncate"
        style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ibm-mono)' }}
      >
        {url}
      </p>
      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className="w-1.5 h-1.5 rounded-full transition-all duration-500"
              style={{
                background: i <= activeStep ? 'var(--accent)' : 'var(--text-secondary)',
                opacity: i <= activeStep ? 1 : 0.3,
              }}
            />
            <span
              className="text-sm transition-all duration-500"
              style={{
                color: i === activeStep ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-ibm-sans)',
                opacity: i <= activeStep ? 1 : 0.5,
              }}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
