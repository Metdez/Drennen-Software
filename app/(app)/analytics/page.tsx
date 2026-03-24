'use client'

import { useRef, useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sql?: string
  error?: boolean
}

const EXAMPLE_QUESTIONS = [
  'Which students submitted the most across all sessions?',
  'What themes came up most often?',
  'How many sessions have been run?',
  'Who wrote about leadership?',
]

export default function AnalyticsPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function submit(question: string) {
    if (!question.trim() || loading) return

    const userMsg: Message = { role: 'user', content: question.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error ?? 'Something went wrong.', error: true },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer, sql: data.sql },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error — please try again.', error: true },
      ])
    } finally {
      setLoading(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Analytics
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Ask plain-English questions about student submissions and session data.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Try asking…
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => submit(q)}
                  className="text-xs px-3 py-2 rounded-full border transition-colors"
                  style={{
                    borderColor: 'var(--border-accent)',
                    color: 'var(--text-secondary)',
                    background: 'var(--surface)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#f36f21'
                    e.currentTarget.style.color = '#f36f21'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-accent)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <div
                className="max-w-[72%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm"
                style={{ background: '#f36f21', color: '#fff' }}
              >
                {msg.content}
              </div>
            ) : (
              <div
                className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm space-y-2"
                style={{
                  background: 'var(--surface-elevated)',
                  color: msg.error ? '#f87171' : 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                {msg.sql && (
                  <details className="mt-2">
                    <summary
                      className="text-xs cursor-pointer select-none"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      View SQL
                    </summary>
                    <pre
                      className="mt-2 text-xs rounded-lg p-3 overflow-x-auto"
                      style={{
                        background: 'var(--surface)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {msg.sql}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm"
              style={{
                background: 'var(--surface-elevated)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              <span className="inline-flex gap-1 items-center">
                <span className="animate-pulse">Thinking</span>
                <span className="animate-bounce delay-75">.</span>
                <span className="animate-bounce delay-150">.</span>
                <span className="animate-bounce delay-300">.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="shrink-0 mt-4 flex items-end gap-3 rounded-2xl border p-3"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border-accent)',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your sessions or students…"
          rows={1}
          disabled={loading}
          className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={() => submit(input)}
          disabled={!input.trim() || loading}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-opacity disabled:opacity-40"
          style={{ background: '#f36f21', color: '#fff' }}
        >
          Send
        </button>
      </div>
    </div>
  )
}
