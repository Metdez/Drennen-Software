# LangChain Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish LangChain as the standard LLM layer for all pipelines by introducing `execution/llm.py` with a validated LCEL chain that replaces the raw Anthropic SDK call in `personalize_leads.py`.

**Architecture:** A new shared module `execution/llm.py` owns all LangChain setup — `ChatAnthropic` config, `PersonalizationLine` Pydantic model, and `build_personalization_chain()` which returns an LCEL chain with automatic retry on bad output and LangSmith tracing support. `personalize_leads.py` swaps its `synthesize_line()` implementation to call the chain; everything else (research waterfall, threading, CSV management) is untouched.

**Tech Stack:** `langchain-core>=0.3.0`, `langchain-anthropic>=0.3.0`, `langsmith>=0.2.0`, `pydantic>=2.0`, `respx` (already in dev deps for mocking)

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `execution/llm.py` | `PersonalizationLine` model, `build_personalization_chain()`, all LangChain setup |
| Create | `tests/test_llm.py` | Unit tests for `PersonalizationLine` and the chain |
| Modify | `requirements.txt` | Add langchain deps |
| Modify | `execution/personalize_leads.py` | Remove raw `Anthropic` call, import chain from `llm.py`, rework `synthesize_line` + `process_lead` + `main` |
| Modify | `tests/test_personalize_leads.py` | Add `TestSynthesizeLine` tests |
| Modify | `CLAUDE.md` | Add LangChain standard section |
| **Unchanged** | `execution/scrape_leads.py` | No LLM calls |
| **Unchanged** | `execution/test_personalize_one.py` | Standalone smoke-test, uses raw SDK directly — not part of main pipeline |

---

## Task 1: Add LangChain Dependencies

**Files:**
- Modify: `requirements.txt`

- [ ] **Step 1: Add the three new packages to `requirements.txt`**

Open `requirements.txt` and add these three lines after the existing entries:

```
langchain-core>=0.3.0
langchain-anthropic>=0.3.0
langsmith>=0.2.0
```

Full file should now read:
```
anthropic>=0.40.0
httpx>=0.27.0
beautifulsoup4>=4.12.0
python-dotenv>=1.0.0
pytest>=8.0.0
respx>=0.21.0
langchain-core>=0.3.0
langchain-anthropic>=0.3.0
langsmith>=0.2.0
```

- [ ] **Step 2: Install dependencies**

```bash
pip install -r requirements.txt
```

Expected: packages install without error. `langchain-anthropic` will pull in `langchain-core` as a transitive dep; no conflict with the existing `anthropic>=0.40.0`.

- [ ] **Step 3: Verify imports resolve**

```bash
python -c "from langchain_anthropic import ChatAnthropic; from langchain_core.prompts import ChatPromptTemplate; from langchain_core.output_parsers import StrOutputParser; from langchain_core.runnables import RunnableLambda; print('OK')"
```

Expected output: `OK`

- [ ] **Step 4: Commit**

```bash
git add requirements.txt
git commit -m "feat(llm): add langchain-core, langchain-anthropic, langsmith deps"
```

---

## Task 2: PersonalizationLine Model (TDD)

**Files:**
- Create: `tests/test_llm.py`
- Create: `execution/llm.py` (skeleton, model only)

- [ ] **Step 1: Write the failing tests**

Create `tests/test_llm.py`:

```python
import pytest
from llm import PersonalizationLine


class TestPersonalizationLine:
    def test_really_cool_passes(self):
        m = PersonalizationLine(line="Really cool that Acme stays independent.")
        assert m.line == "Really cool that Acme stays independent."

    def test_love_that_passes(self):
        m = PersonalizationLine(line="Love that Acme has stayed owner-led.")
        assert m.line == "Love that Acme has stayed owner-led."

    def test_love_how_passes(self):
        m = PersonalizationLine(line="Love how Acme built a regional 3PL.")
        assert m.line == "Love how Acme built a regional 3PL."

    def test_impressive_that_passes(self):
        m = PersonalizationLine(line="Impressive that Acme ships packages daily.")
        assert m.line == "Impressive that Acme ships packages daily."

    def test_strips_straight_double_quotes(self):
        m = PersonalizationLine(line='"Really cool that Acme stays independent."')
        assert m.line == "Really cool that Acme stays independent."

    def test_strips_straight_single_quotes(self):
        m = PersonalizationLine(line="'Love that Acme stayed owner-led.'")
        assert m.line == "Love that Acme stayed owner-led."

    def test_strips_smart_double_quotes(self):
        m = PersonalizationLine(line="\u201cLove that Acme stayed owner-led.\u201d")
        assert m.line == "Love that Acme stayed owner-led."

    def test_strips_smart_single_quotes(self):
        m = PersonalizationLine(line="\u2018Love that Acme stayed owner-led.\u2019")
        assert m.line == "Love that Acme stayed owner-led."

    def test_strips_surrounding_whitespace(self):
        m = PersonalizationLine(line="  Really cool that Acme stays independent.  ")
        assert m.line == "Really cool that Acme stays independent."

    def test_invalid_opener_raises(self):
        with pytest.raises(ValueError, match="invalid opener"):
            PersonalizationLine(line="I cannot write a personalization for this business.")

    def test_empty_string_raises(self):
        with pytest.raises(ValueError):
            PersonalizationLine(line="")

    def test_meta_commentary_raises(self):
        with pytest.raises(ValueError):
            PersonalizationLine(line="I don't have enough context to write this.")

    def test_case_insensitive_opener(self):
        m = PersonalizationLine(line="really cool that Acme stays independent.")
        assert m.line == "really cool that Acme stays independent."
```

- [ ] **Step 2: Run tests — confirm they all fail with ImportError**

```bash
cd "c:/Users/John Doe/Music/LEADS"
pytest tests/test_llm.py -v
```

Expected: `ImportError: No module named 'llm'` (or similar — `llm.py` doesn't exist yet)

- [ ] **Step 3: Create `execution/llm.py` with just the model**

```python
"""LangChain LLM layer — shared entry point for all pipelines in this repo.

Usage:
    from llm import build_personalization_chain
    chain = build_personalization_chain(api_key="...")
    line = chain.invoke({"business": ..., "owner": ..., "location": ..., "context": ...})
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, field_validator

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

_VALID_OPENERS = ("really cool", "love that", "love how", "impressive that")


class PersonalizationLine(BaseModel):
    line: str

    @field_validator("line")
    @classmethod
    def must_have_valid_opener(cls, v: str) -> str:
        for ch in ('"', "'", "\u201c", "\u201d", "\u2018", "\u2019"):
            v = v.strip(ch)
        v = v.strip()
        if not v.lower().startswith(_VALID_OPENERS):
            raise ValueError(f"invalid opener: {v[:40]!r}")
        return v
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
pytest tests/test_llm.py -v
```

Expected: 13 tests PASSED

- [ ] **Step 5: Commit**

```bash
git add execution/llm.py tests/test_llm.py
git commit -m "feat(llm): PersonalizationLine Pydantic model with opener validator"
```

---

## Task 3: Build the Personalization Chain (TDD)

**Files:**
- Modify: `tests/test_llm.py` — add `TestBuildPersonalizationChain`
- Modify: `execution/llm.py` — add `HAIKU_MODEL`, `STYLE_SYSTEM_PROMPT`, `build_personalization_chain()`

- [ ] **Step 1: Add the failing chain tests to `tests/test_llm.py`**

Add these imports at the top of `tests/test_llm.py`:

```python
import httpx
import respx
from llm import PersonalizationLine, build_personalization_chain
```

Then add this class after `TestPersonalizationLine`:

```python
def _anthropic_response(text: str) -> dict:
    return {
        "id": "msg_test",
        "type": "message",
        "role": "assistant",
        "content": [{"type": "text", "text": text}],
        "model": "claude-haiku-4-5-20251001",
        "stop_reason": "end_turn",
        "stop_sequence": None,
        "usage": {
            "input_tokens": 50,
            "output_tokens": 20,
            "cache_creation_input_tokens": 0,
            "cache_read_input_tokens": 0,
        },
    }


_SAMPLE_INPUT = {
    "business": "Acme Logistics",
    "owner": "John Smith",
    "location": "Los Angeles, CA",
    "context": "Acme Logistics is a 3PL provider founded in 2005 in LA.",
}


class TestBuildPersonalizationChain:
    @respx.mock
    def test_happy_path_returns_valid_line(self):
        respx.post("https://api.anthropic.com/v1/messages").mock(
            return_value=httpx.Response(
                200,
                json=_anthropic_response(
                    "Really cool that Acme Logistics has stayed independently owner-led."
                ),
            )
        )
        chain = build_personalization_chain(api_key="sk-ant-test")
        result = chain.invoke(_SAMPLE_INPUT)
        assert result == "Really cool that Acme Logistics has stayed independently owner-led."

    @respx.mock
    def test_retries_once_on_invalid_opener(self):
        route = respx.post("https://api.anthropic.com/v1/messages")
        route.side_effect = [
            httpx.Response(
                200,
                json=_anthropic_response("I cannot write this personalization."),
            ),
            httpx.Response(
                200,
                json=_anthropic_response("Really cool that Acme stayed independent in LA."),
            ),
        ]
        chain = build_personalization_chain(api_key="sk-ant-test")
        result = chain.invoke(_SAMPLE_INPUT)
        assert result == "Really cool that Acme stayed independent in LA."
        assert route.call_count == 2

    @respx.mock
    def test_raises_when_both_attempts_produce_invalid_output(self):
        route = respx.post("https://api.anthropic.com/v1/messages")
        route.side_effect = [
            httpx.Response(200, json=_anthropic_response("I cannot help with this.")),
            httpx.Response(200, json=_anthropic_response("This business has no information.")),
        ]
        chain = build_personalization_chain(api_key="sk-ant-test")
        with pytest.raises(Exception):
            chain.invoke(_SAMPLE_INPUT)

    @respx.mock
    def test_strips_quotes_from_output(self):
        respx.post("https://api.anthropic.com/v1/messages").mock(
            return_value=httpx.Response(
                200,
                json=_anthropic_response(
                    '"Really cool that Acme has stayed independent."'
                ),
            )
        )
        chain = build_personalization_chain(api_key="sk-ant-test")
        result = chain.invoke(_SAMPLE_INPUT)
        assert result == "Really cool that Acme has stayed independent."
        assert not result.startswith('"')
```

- [ ] **Step 2: Run tests — confirm new chain tests fail**

```bash
pytest tests/test_llm.py::TestBuildPersonalizationChain -v
```

Expected: `ImportError` or `AttributeError` — `build_personalization_chain` not yet defined

- [ ] **Step 3: Implement `build_personalization_chain()` in `execution/llm.py`**

Replace the entire contents of `execution/llm.py` with:

```python
"""LangChain LLM layer — shared entry point for all pipelines in this repo.

Usage:
    from llm import build_personalization_chain
    chain = build_personalization_chain(api_key="...")
    line = chain.invoke({"business": ..., "owner": ..., "location": ..., "context": ...})
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda
from pydantic import BaseModel, field_validator

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

HAIKU_MODEL = "claude-haiku-4-5-20251001"

STYLE_SYSTEM_PROMPT = """You write single-sentence personalization lines for cold emails to business owners.

Rules:
- Exactly ONE sentence, under 25 words.
- Start with "Really cool", "Love that", or "Impressive that".
- Reference ONE specific, non-obvious fact about the business (tenure, ownership model, geography, niche, product, process). Avoid generic observations.
- Warm, observational tone. NEVER sales language, NEVER questions, NEVER a pitch.
- End with an implicit contrast when natural ("rare these days", "most don't", "still thriving").
- If the context is thin, write something honest about the business's industry + location rather than fabricating.

CRITICAL — never reference private/internal data:
- NEVER mention dollar figures, revenue, profit, funding, or any financial metric. No "$2M", no "growing to X", no revenue references of any kind.
- NEVER mention personal details like birth date, age, or the owner's family.
- Only reference facts that would be obvious from a 30-second look at the company's public website.

CRITICAL — you MUST ALWAYS return a valid sentence:
- NEVER refuse. NEVER ask for more information. NEVER say "I don't have enough" or "I need more context" or "could you share".
- NEVER explain what you can't do. NEVER apologize. NEVER write meta-commentary.
- If the business name is cryptic (e.g. "LARKIN ENTERPRISES", "FBHS LLC", random initials) and you genuinely cannot infer the industry, use this safe fallback shape: "Really cool that {name} has stayed independently owner-led in {city} while so many small businesses there have been rolled up by larger players." Adapt lightly so it doesn't sound identical each time.
- If the owner's first name is clearly visible, you may address them as "you" naturally ("Really cool that you've kept [Business] running independently in [City]...").
- Your output is ALWAYS exactly one sentence starting with "Really cool", "Love that", or "Impressive that".

Examples of the target style:
- "Really cool how you've built one of the few independent medical billing practices still thriving in rural Mississippi."
- "Love that Progressive Medical has stayed owner-led in a space that's been getting rolled up by PE for a decade."
- "Impressive that Paradigm actually manufactures personnel parachutes in-house in Pensacola — not many defense suppliers still do."
- Fallback when context is thin: "Really cool that Larkin Enterprises has stayed independently owner-led in Houston while so many small businesses there have been rolled up."

Return ONLY the sentence. No preamble, no quotes, no explanation.
"""

_USER_MSG_TEMPLATE = (
    "Business: {business}\n"
    "Owner: {owner}\n"
    "Location: {location}\n\n"
    "Research context:\n{context}\n\n"
    "Write the one-sentence personalization line now."
)

_STRICT_SUFFIX = (
    "\n\nIMPORTANT: Output ONLY the sentence. No preamble, no quotes, no explanation."
)

_VALID_OPENERS = ("really cool", "love that", "love how", "impressive that")


class PersonalizationLine(BaseModel):
    line: str

    @field_validator("line")
    @classmethod
    def must_have_valid_opener(cls, v: str) -> str:
        for ch in ('"', "'", "\u201c", "\u201d", "\u2018", "\u2019"):
            v = v.strip(ch)
        v = v.strip()
        if not v.lower().startswith(_VALID_OPENERS):
            raise ValueError(f"invalid opener: {v[:40]!r}")
        return v


def _validate(text: str) -> str:
    return PersonalizationLine(line=text).line


def build_personalization_chain(api_key: str | None = None):
    """Return an LCEL chain: prompt -> Haiku 4.5 -> validate -> (retry with strict prompt).

    Input dict keys: business, owner, location, context.
    Output: validated personalization line as a plain str.
    Raises: Exception if BOTH primary and retry produce invalid output (caller handles fallback).
    """
    key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")

    llm = ChatAnthropic(
        model=HAIKU_MODEL,
        anthropic_api_key=key,
        max_tokens=80,
        model_kwargs={
            "system": [
                {
                    "type": "text",
                    "text": STYLE_SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ]
        },
    )

    str_parser = StrOutputParser()
    validate = RunnableLambda(_validate)

    primary_prompt = ChatPromptTemplate.from_messages([("human", _USER_MSG_TEMPLATE)])
    strict_prompt = ChatPromptTemplate.from_messages(
        [("human", _USER_MSG_TEMPLATE + _STRICT_SUFFIX)]
    )

    primary = primary_prompt | llm | str_parser | validate
    retry = strict_prompt | llm | str_parser | validate

    return primary.with_fallbacks([retry], exceptions_to_handle=(ValueError,))
```

- [ ] **Step 4: Run all llm tests**

```bash
pytest tests/test_llm.py -v
```

Expected: all 17 tests PASSED

- [ ] **Step 5: Run full suite — confirm no regressions**

```bash
pytest tests/ -v
```

Expected: all tests PASSED

- [ ] **Step 6: Commit**

```bash
git add execution/llm.py tests/test_llm.py
git commit -m "feat(llm): build_personalization_chain — LCEL chain with Pydantic validation and retry"
```

---

## Task 4: Wire `personalize_leads.py` to the Chain

**Files:**
- Modify: `execution/personalize_leads.py`
- Modify: `tests/test_personalize_leads.py`

- [ ] **Step 1: Write the failing synthesize_line tests**

Add this class to the end of `tests/test_personalize_leads.py`:

```python
from unittest.mock import MagicMock


class TestSynthesizeLine:
    def test_returns_chain_output_on_success(self):
        chain = MagicMock()
        chain.invoke.return_value = "Really cool that Acme stayed independent."
        lead = {
            "Business Name": "Acme",
            "Owner Full Name": "John Smith",
            "City": "LA",
            "State": "CA",
        }
        result = p.synthesize_line(chain, lead, "some context")
        assert result == "Really cool that Acme stayed independent."
        chain.invoke.assert_called_once_with({
            "business": "Acme",
            "owner": "John Smith",
            "location": "LA, CA",
            "context": "some context",
        })

    def test_returns_fallback_when_chain_raises(self):
        chain = MagicMock()
        chain.invoke.side_effect = Exception("chain failed")
        lead = {
            "Business Name": "Larkin Enterprises",
            "Owner Full Name": "",
            "City": "Houston",
            "State": "TX",
        }
        result = p.synthesize_line(chain, lead, "")
        assert result.lower().startswith("really cool")
        assert "Larkin Enterprises" in result

    def test_fallback_includes_city_when_present(self):
        chain = MagicMock()
        chain.invoke.side_effect = Exception("chain failed")
        lead = {
            "Business Name": "FBHS LLC",
            "Owner Full Name": "",
            "City": "Dallas",
            "State": "TX",
        }
        result = p.synthesize_line(chain, lead, "")
        assert "Dallas" in result

    def test_fallback_handles_missing_city(self):
        chain = MagicMock()
        chain.invoke.side_effect = Exception("chain failed")
        lead = {"Business Name": "Mystery Co", "Owner Full Name": "", "City": "", "State": ""}
        result = p.synthesize_line(chain, lead, "")
        assert result.lower().startswith("really cool")
```

- [ ] **Step 2: Run only the new tests — confirm they fail**

```bash
pytest tests/test_personalize_leads.py::TestSynthesizeLine -v
```

Expected: `AttributeError` — `synthesize_line` still takes `client: Anthropic` as first arg

- [ ] **Step 3: Update `execution/personalize_leads.py`**

**3a. Change the imports at the top of the file.**

Remove:
```python
from anthropic import Anthropic
```

Add in its place:
```python
from llm import build_personalization_chain
```

**3b. Remove `HAIKU_MODEL` and `STYLE_SYSTEM_PROMPT` constants.**

Delete these two blocks entirely (they live in `execution/llm.py` now):
```python
HAIKU_MODEL = "claude-haiku-4-5-20251001"
```
and the entire multiline `STYLE_SYSTEM_PROMPT = """..."""` string.

**3c. Replace the `synthesize_line` function entirely.**

Delete the old `synthesize_line(client: Anthropic, lead: dict, context: str) -> str:` function and replace it with:

```python
def synthesize_line(chain, lead: dict, context: str) -> str:
    """Call the LangChain personalization chain. Falls back to a deterministic
    string if both chain attempts fail (Level 3 of the retry ladder)."""
    try:
        return chain.invoke({
            "business": lead.get("Business Name", ""),
            "owner": lead.get("Owner Full Name", ""),
            "location": f"{lead.get('City', '')}, {lead.get('State', '')}",
            "context": context,
        })
    except Exception:
        biz = (lead.get("Business Name") or "").strip().title() or "this business"
        city = (lead.get("City") or "").strip().title()
        where = f" in {city}" if city else ""
        return (
            f"Really cool that {biz} has stayed independently owner-led{where} "
            f"while so many small businesses have been rolled up by bigger players."
        )
```

**3d. Update the `process_lead` function signature.**

Change the parameter name from `client: Anthropic` to `chain`:

```python
def process_lead(
    idx: int,
    lead: dict,
    chain,
    logger: logging.Logger,
) -> tuple[int, str, str]:
```

Inside `process_lead`, the call to `synthesize_line` uses the same positional argument, so no change is needed there — it already reads `synthesize_line(chain, lead, context)` once the rename is applied.

Wait — verify the existing call site. It currently reads:
```python
line = synthesize_line(client, lead, context)
```
After renaming the parameter to `chain`, this becomes:
```python
line = synthesize_line(chain, lead, context)
```
which is correct.

**3e. Update `main()` — replace Anthropic client with LangChain chain.**

Find this block in `main()`:
```python
client = Anthropic(api_key=api_key)
```
Replace with:
```python
chain = build_personalization_chain(api_key=api_key)
```

Find this line inside the `ThreadPoolExecutor` block:
```python
pool.submit(process_lead, i, rows[i], client, logger)
```
Replace with:
```python
pool.submit(process_lead, i, rows[i], chain, logger)
```

- [ ] **Step 4: Run the new synthesize_line tests — confirm they pass**

```bash
pytest tests/test_personalize_leads.py::TestSynthesizeLine -v
```

Expected: 4 tests PASSED

- [ ] **Step 5: Run the full test suite**

```bash
pytest tests/ -v
```

Expected: all tests PASSED. The existing `TestEmailDomain`, `TestIsAggregator`, etc. are unchanged and still pass.

- [ ] **Step 6: Commit**

```bash
git add execution/personalize_leads.py tests/test_personalize_leads.py
git commit -m "feat(leads): wire personalize_leads to LangChain chain via llm.py"
```

---

## Task 5: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md` (project-level, at repo root)

- [ ] **Step 1: Add LangChain section to `CLAUDE.md`**

Find the `## External APIs (keys in `.env`)` section in `CLAUDE.md` and insert this new section **before** it:

```markdown
## LangChain Standard

LangChain is the standard LLM layer for all pipelines in this repo. All LLM calls go through `execution/llm.py` — do not call the `anthropic` SDK directly in new scripts.

### Key exports from `execution/llm.py`
- `build_personalization_chain(api_key=None)` — returns an LCEL chain for lead personalization. Input: `{business, owner, location, context}`. Output: validated `str`.
- `PersonalizationLine` — Pydantic model for output validation. Validator enforces opener rules and strips surrounding quotes.
- `HAIKU_MODEL` — canonical model name string (`claude-haiku-4-5-20251001`).
- `STYLE_SYSTEM_PROMPT` — the cached system prompt for personalization.

### LangSmith tracing (optional)
Add to `.env` to enable run tracing at smith.langchain.com:
```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=<your-langsmith-key>
LANGCHAIN_PROJECT=licom-leads
```
When these vars are absent, tracing is a no-op with zero overhead.

### Retry / fallback ladder
1. **Primary** — normal chain invoke, Pydantic validates opener
2. **Retry** — re-invokes with strict suffix on the user prompt (`exceptions_to_handle=(ValueError,)`)
3. **Hardcoded fallback** — plain Python `except Exception` in `synthesize_line()` returns a deterministic string; LangChain never handles this level

```

- [ ] **Step 2: Verify the file looks right**

```bash
grep -n "LangChain Standard" CLAUDE.md
```

Expected: one match on the line you just added.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude-md): add LangChain standard section — execution/llm.py, LangSmith env vars"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] `execution/llm.py` created with `ChatAnthropic`, `PersonalizationLine`, `build_personalization_chain()` → Task 3
- [x] System prompt caching via `cache_control` in `model_kwargs` → Task 3 Step 3
- [x] Pydantic `PersonalizationLine` model with opener validator → Task 2
- [x] LCEL chain with `with_fallbacks` for retry → Task 3
- [x] Level 3 hardcoded fallback in `synthesize_line` → Task 4
- [x] `synthesize_line` is a drop-in for `process_lead` → Task 4
- [x] LangSmith toggle via env vars → Task 5
- [x] `requirements.txt` updated → Task 1
- [x] `CLAUDE.md` updated → Task 5
- [x] `scrape_leads.py` untouched → not in file map
- [x] `test_personalize_one.py` untouched → not in file map (standalone script, own raw SDK usage)
- [x] Tests for `PersonalizationLine` validator → Task 2
- [x] Tests for chain retry behavior → Task 3
- [x] Tests for `synthesize_line` fallback → Task 4

**Placeholder scan:** No TBDs, TODOs, or "similar to above" references. Every step has full code.

**Type consistency:** `chain` parameter name used consistently across `process_lead`, `main`, and `synthesize_line`. `build_personalization_chain` returns the same type that `chain.invoke()` is called on throughout. `synthesize_line` always returns `str`.
