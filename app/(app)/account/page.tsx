/**
 * Account page (`/account`).
 *
 * Portfolio: `PortfolioSharePanel` component — creates/revokes public portfolio tokens.
 *
 * System Prompt: `SystemPromptEditor` component — view/create/activate custom prompt versions.
 *
 * Components: PortfolioSharePanel, SystemPromptEditor
 */
'use client'

import { PortfolioSharePanel } from '@/components/layout/PortfolioSharePanel'
import { SystemPromptEditor } from '@/components/session/SystemPromptEditor'

/**
 * What it does: Renders the account page with portfolio sharing and AI system prompt settings.
 * Why it is used: Gives professors a single place to manage sharing and AI configuration.
 */
export default function AccountPage() {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-10 lg:pl-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
            Account Details
          </h1>
          <p className="text-[var(--text-secondary)] text-lg font-[family-name:var(--font-dm-sans)] max-w-xl">
            Manage your portfolio sharing and AI settings.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Portfolio Share Panel */}
        <div className="animate-fade-up-delay-2">
          <PortfolioSharePanel />
        </div>

        <div
          className="animate-fade-up-delay-2 rounded-3xl p-8"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-accent)',
          }}
        >
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
            AI System Prompt
          </h2>
          <p className="mt-2 mb-6 text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-secondary)]">
            Customize the prompt used to generate interview sheets from student submissions.
          </p>
          <SystemPromptEditor compact={false} defaultExpanded={false} />
        </div>
      </div>
    </div>
  )
}
