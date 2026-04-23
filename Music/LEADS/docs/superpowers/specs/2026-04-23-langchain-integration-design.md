# LangChain Integration Design

**Date:** 2026-04-23
**Scope:** Establish LangChain as the standard LLM layer across all pipelines in this repo, starting with `personalize_leads.py`.

---

## Problem

`personalize_leads.py` calls the Anthropic SDK directly with manual prompt construction, a hand-rolled opener validator, and a single hardcoded fallback. There is no standard pattern for LLM calls — future pipelines would each reinvent this. There is also no observability (no tracing, no per-run cost visibility).

---

## Goal

- Replace the raw `Anthropic()` call in `synthesize_line()` with a LangChain LCEL chain
- Add structured output validation (Pydantic), automatic retry, and a clean fallback ladder
- Enable LangSmith tracing via env vars with zero-overhead when off
- Establish `execution/llm.py` as the single LangChain entry point for all current and future pipelines

---

## Architecture

### New file: `execution/llm.py`

Single module that owns all LangChain setup for the repo. Contains:

1. **`ChatAnthropic` instance** — Haiku 4.5, API key from `.env`, prompt caching via `cache_control` header (preserves existing cost profile)
2. **`PersonalizationLine` Pydantic model** — `line: str` with a `@field_validator` enforcing valid openers (`"really cool"`, `"love that"`, `"love how"`, `"impressive that"`)
3. **`PersonalizationChain`** — LCEL chain: `PromptTemplate | ChatAnthropic | PydanticOutputParser`, wrapped in `RunnableWithFallbacks` for retry
4. **LangSmith toggle** — activated automatically when `LANGCHAIN_TRACING_V2=true` + `LANGCHAIN_API_KEY` are present in `.env`; no-op otherwise

### Modified file: `execution/personalize_leads.py`

- Remove `synthesize_line()` function
- Import `PersonalizationChain` from `execution/llm.py`
- Call `PersonalizationChain.invoke(lead_data)` in `process_lead()`
- All other logic (research waterfall, CSV management, threading, logging) unchanged

### Unchanged: `execution/scrape_leads.py`

No LLM calls today. When LLM steps are added in the future, they reach for `execution/llm.py`.

---

## Data Flow

```
research_lead(lead) → (context_str, source_label)   [unchanged]
        │
        ▼
PersonalizationChain.invoke({
    "business": lead["Business Name"],
    "owner":    lead["Owner Full Name"],
    "location": "{City}, {State}",
    "context":  context_str,
})
        │
        ├─ PromptTemplate  → formats user message (same content as current synthesize_line)
        ├─ ChatAnthropic   → Haiku 4.5, system prompt cached via cache_control
        ├─ PydanticOutputParser → validates PersonalizationLine.line opener
        │        │
        │        ├─ VALID  → return line (str)
        │        └─ PARSE ERROR → retry once with stricter prompt suffix
        │                   └─ still fails → deterministic hardcoded fallback
        │
        ▼
returns str  ← drop-in for synthesize_line(), process_lead() unchanged
```

---

## Pydantic Model

```python
class PersonalizationLine(BaseModel):
    line: str

    @field_validator("line")
    def must_have_valid_opener(cls, v):
        if not v.lower().startswith(("really cool", "love that", "love how", "impressive that")):
            raise ValueError("invalid opener")
        return v.strip().strip('"\'')
```

---

## Retry / Fallback Ladder

| Level | Trigger | Action |
|---|---|---|
| 1 | First attempt | Normal chain invoke, Pydantic validates opener |
| 2 | Parse error on attempt 1 | `RunnableWithFallbacks` re-invokes a second chain variant with suffix appended to the user prompt: `"Output ONLY the sentence. No preamble, no quotes."` |
| 3 | Parse error on attempt 2 OR any `Exception` from the chain | Plain Python `except` block outside the chain returns the deterministic hardcoded fallback string — LangChain does not handle this level, so it can never silently swallow the error |

No row is ever left blank.

---

## LangSmith Tracing

Add to `.env` to enable:
```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=<your-langsmith-key>
LANGCHAIN_PROJECT=licom-leads
```

When these vars are absent, LangChain is a complete no-op on tracing — zero performance overhead. When present, each `chain.invoke()` call is a traced run named `"personalize_lead"` with lead metadata (business name, source label) attached as tags.

---

## Testing

- **`tests/test_llm.py`** (new) — unit tests for `PersonalizationLine` validator: valid openers pass, refusals/empty strings/quoted strings raise. Mock Anthropic HTTP with `respx`.
- **Existing `tests/`** — unchanged, still green. `personalize_leads.py` public interface is identical.
- **`execution/test_personalize_one.py`** — works as-is, calls through same `process_lead()` path.

---

## CLAUDE.md Addition

A new section added to the project `CLAUDE.md` noting:
- LangChain is the standard LLM layer for all pipelines
- All LLM calls go through `execution/llm.py`
- LangSmith env vars for tracing

---

## Dependencies Added to `requirements.txt`

```
langchain>=0.3.0
langchain-anthropic>=0.3.0
langsmith>=0.2.0
```

---

## What Is Not Changing

- Research waterfall in `personalize_leads.py` (Tier 1/2/3 scrape logic)
- CSV management, threading, flush logic
- `scrape_leads.py` (no LLM calls)
- Existing directive files (except additive CLAUDE.md note)
- Run commands and env var interface
