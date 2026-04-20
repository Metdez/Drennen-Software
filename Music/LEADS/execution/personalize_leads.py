"""Populate Personalization + Status columns in the leads CSV.

Pipeline: research (free, tiered) -> Haiku 4.5 synthesis -> CSV write.
Resume-safe: rows with Status=done are skipped.
"""

from __future__ import annotations

import csv
import logging
import os
import queue
import re
import shutil
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote_plus, unquote, urlparse

import httpx
from anthropic import Anthropic
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# ---------------------------- Config ----------------------------

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

CSV_PATH = Path(os.environ.get("LEADS_CSV", ROOT / "ZackBiz Owner Leads 4-4-26 - Sheet1.csv"))
BACKUP_PATH = CSV_PATH.with_suffix(CSV_PATH.suffix + ".bak")
LOG_PATH = ROOT / ".tmp" / "personalize_run.log"

PERSONALIZATION_COL = "Personalization"
STATUS_COL = "Status"
STATUS_PENDING = "pending"
STATUS_DONE = "done"
STATUS_FAILED = "failed"

MAX_WORKERS = 30
FLUSH_EVERY_N = 25
FLUSH_EVERY_SECONDS = 10.0
HTTP_TIMEOUT = 6.0
MAX_PAGE_CHARS = 1800
MAX_CONTEXT_CHARS = 3600
MIN_CONTEXT_LEN = 300
USER_AGENT = "Mozilla/5.0 (compatible; LicomLeadBot/1.0; +https://licom.ai)"

PERSONAL_EMAIL_DOMAINS = frozenset({
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "icloud.com", "aol.com", "live.com", "msn.com", "me.com",
    "comcast.net", "verizon.net", "att.net", "sbcglobal.net",
})

AGGREGATOR_HOSTS = frozenset({
    "facebook.com", "m.facebook.com",
    "linkedin.com", "www.linkedin.com",
    "yelp.com", "www.yelp.com",
    "bbb.org", "www.bbb.org",
    "yellowpages.com", "www.yellowpages.com",
    "mapquest.com", "www.mapquest.com",
    "indeed.com", "glassdoor.com",
    "crunchbase.com", "zoominfo.com",
    "bloomberg.com", "dnb.com",
    "manta.com", "buzzfile.com",
})

# ---------------------------- Pure helpers ----------------------------

def email_domain(email: str) -> str | None:
    """Return the business domain from an email, or None if personal/invalid."""
    if not email or "@" not in email:
        return None
    domain = email.split("@", 1)[1].strip().lower()
    if not domain or domain in PERSONAL_EMAIL_DOMAINS:
        return None
    return domain


def is_aggregator(url: str) -> bool:
    """True if URL's host is in the aggregator denylist."""
    try:
        host = urlparse(url).netloc.lower()
    except Exception:
        return True
    return not host or host in AGGREGATOR_HOSTS


def extract_text(html: str) -> str:
    """Strip scripts/nav/footers, collapse whitespace, return visible text."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "noscript", "nav", "footer", "header"]):
        tag.decompose()
    return re.sub(r"\s+", " ", soup.get_text(" ")).strip()


def unwrap_ddg_url(href: str) -> str | None:
    """DuckDuckGo HTML wraps results in /l/?uddg=<url-encoded>. Unwrap, else return
    the href if it's already absolute. Return None if unusable."""
    m = re.search(r"uddg=([^&]+)", href)
    if m:
        return unquote(m.group(1))
    if href.startswith("http"):
        return href
    return None

# ---------------------------- HTTP scrape ----------------------------

_scrape_client: httpx.Client | None = None
_scrape_client_lock = threading.Lock()


def _get_client() -> httpx.Client:
    """Module-level shared client for connection pooling."""
    global _scrape_client
    if _scrape_client is None:
        with _scrape_client_lock:
            if _scrape_client is None:
                _scrape_client = httpx.Client(
                    follow_redirects=True,
                    timeout=HTTP_TIMEOUT,
                    headers={"User-Agent": USER_AGENT},
                )
    return _scrape_client


def fetch_html(url: str) -> str:
    """Fetch a URL and return raw HTML. Returns empty string on any failure.

    One retry with 0.5s backoff on transport errors or 5xx.
    """
    client = _get_client()
    for attempt in (1, 2):
        try:
            resp = client.get(url)
            if resp.status_code >= 500 and attempt == 1:
                time.sleep(0.5)
                continue
            if resp.status_code != 200:
                return ""
            if "text/html" not in resp.headers.get("content-type", "").lower():
                return ""
            return resp.text
        except httpx.RequestError:
            if attempt == 1:
                time.sleep(0.5)
                continue
            return ""
    return ""


def fetch_business_site(domain: str) -> str:
    """Fetch homepage + /about + /about-us for a domain. Return combined cleaned text,
    capped at MAX_CONTEXT_CHARS. Each page capped at MAX_PAGE_CHARS."""
    chunks: list[str] = []
    total = 0
    for path in ("", "/about", "/about-us"):
        if total >= MAX_CONTEXT_CHARS:
            break
        url = f"https://{domain}{path}"
        html = fetch_html(url)
        if not html:
            continue
        text = extract_text(html)
        if not text:
            continue
        snippet = text[:MAX_PAGE_CHARS]
        chunks.append(f"[{url}]\n{snippet}")
        total += len(snippet)
    return "\n\n".join(chunks)[:MAX_CONTEXT_CHARS]


def duckduckgo_search(query: str, limit: int = 5) -> list[str]:
    """Return up to `limit` result URLs from DuckDuckGo HTML endpoint (no API key).

    Handles DDG's `/l/?uddg=` redirect wrapping. Returns [] on any error.
    """
    url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
    html = fetch_html(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    out: list[str] = []
    for a in soup.select("a.result__a"):
        href = a.get("href", "")
        resolved = unwrap_ddg_url(href)
        if resolved:
            out.append(resolved)
        if len(out) >= limit:
            break
    return out


# ---------------------------- Research waterfall ----------------------------

def research_lead(lead: dict) -> tuple[str, str]:
    """Produce (context_text, source_label) for one lead via tiered waterfall.

    Tier 1: business-domain email -> scrape that domain.
    Tier 2: DuckDuckGo search for business name + city + state, scrape first
            non-aggregator hit.
    Tier 3: generic template using just the CSV fields.
    """
    business = lead.get("Business Name", "").strip()
    city = lead.get("City", "").strip()
    state = lead.get("State", "").strip()
    email = lead.get("Email", "").strip()

    # Tier 1 — email domain
    domain = email_domain(email)
    if domain:
        text = fetch_business_site(domain)
        if len(text) >= MIN_CONTEXT_LEN:
            return text, f"email-domain:{domain}"

    # Tier 2 — DuckDuckGo search
    if business:
        query = f'"{business}" {city} {state}'.strip()
        for url in duckduckgo_search(query):
            if is_aggregator(url):
                continue
            host = urlparse(url).netloc.lower().removeprefix("www.")
            if not host:
                continue
            text = fetch_business_site(host)
            if len(text) >= MIN_CONTEXT_LEN:
                return text, f"duckduckgo:{host}"

    # Tier 3 — generic
    generic = (
        f"Business: {business or 'Unknown'}. "
        f"Location: {city}, {state}. "
        f"Owner: {lead.get('Owner Full Name', 'Unknown')}."
    )
    return generic, "fallback:generic"


# ---------------------------- Haiku synthesis ----------------------------

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

HAIKU_MODEL = "claude-haiku-4-5-20251001"


def synthesize_line(client: Anthropic, lead: dict, context: str) -> str:
    """Call Haiku 4.5 once and return the cleaned one-sentence line."""
    user_msg = (
        f"Business: {lead.get('Business Name', '')}\n"
        f"Owner: {lead.get('Owner Full Name', '')}\n"
        f"Location: {lead.get('City', '')}, {lead.get('State', '')}\n\n"
        f"Research context:\n{context}\n\n"
        f"Write the one-sentence personalization line now."
    )
    resp = client.messages.create(
        model=HAIKU_MODEL,
        max_tokens=80,
        system=[
            {
                "type": "text",
                "text": STYLE_SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )
    line = resp.content[0].text.strip()
    # Strip surrounding smart or straight quotes in case Haiku wraps its output.
    for ch in ('"', "'", "\u201c", "\u201d", "\u2018", "\u2019"):
        if line.startswith(ch):
            line = line[1:]
        if line.endswith(ch):
            line = line[:-1]
    line = line.strip()

    # Belt-and-suspenders: if Haiku produced meta-commentary or a refusal
    # instead of a valid opener, replace with a safe deterministic fallback.
    valid_prefixes = ("really cool", "love that", "love how", "impressive that")
    if not line.lower().startswith(valid_prefixes):
        biz = (lead.get("Business Name") or "").strip().title() or "this business"
        city = (lead.get("City") or "").strip().title()
        where = f" in {city}" if city else ""
        line = (
            f"Really cool that {biz} has stayed independently owner-led{where} "
            f"while so many small businesses have been rolled up by bigger players."
        )
    return line


# ---------------------------- CSV manager ----------------------------

def ensure_columns(rows: list[dict], fieldnames: list[str]) -> list[str]:
    """Mutate `rows` and `fieldnames` in place to add Personalization + Status
    columns if missing. Existing values preserved. Missing values default to ''
    for Personalization and STATUS_PENDING for Status.

    Returns the updated fieldnames list.
    """
    updated = list(fieldnames)
    if PERSONALIZATION_COL not in updated:
        updated.append(PERSONALIZATION_COL)
        for row in rows:
            row.setdefault(PERSONALIZATION_COL, "")
    else:
        for row in rows:
            row.setdefault(PERSONALIZATION_COL, "")

    if STATUS_COL not in updated:
        updated.append(STATUS_COL)
        for row in rows:
            row.setdefault(STATUS_COL, STATUS_PENDING)
    else:
        for row in rows:
            if not row.get(STATUS_COL):
                row[STATUS_COL] = STATUS_PENDING
    return updated


def load_leads(csv_path: Path) -> tuple[list[dict], list[str]]:
    """Read the CSV and return (rows, fieldnames). UTF-8 with sig stripping."""
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = list(reader.fieldnames or [])
    return rows, fieldnames


def backup_once(csv_path: Path, backup_path: Path) -> None:
    """Copy csv_path to backup_path ONLY if backup doesn't already exist."""
    if not backup_path.exists():
        shutil.copy2(csv_path, backup_path)


def write_csv_atomic(csv_path: Path, rows: list[dict], fieldnames: list[str]) -> None:
    """Write CSV to a temp file next to target, then os.replace. Crash-safe."""
    tmp = csv_path.with_suffix(csv_path.suffix + ".tmp")
    with open(tmp, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    os.replace(tmp, csv_path)


class WriterThread(threading.Thread):
    """Drains (row_index, personalization, status) updates from a queue, applies
    them to the shared `rows` list, and flushes the CSV when enough updates have
    accumulated or enough time has elapsed. Exits when a None sentinel is received.
    """

    SENTINEL: object = object()

    def __init__(
        self,
        rows: list[dict],
        fieldnames: list[str],
        csv_path: Path,
        q: "queue.Queue[tuple[int, str, str] | None]",
        flush_every_n: int = FLUSH_EVERY_N,
        flush_every_seconds: float = FLUSH_EVERY_SECONDS,
    ) -> None:
        super().__init__(daemon=True, name="csv-writer")
        self.rows = rows
        self.fieldnames = fieldnames
        self.csv_path = csv_path
        self.q = q
        self.flush_every_n = flush_every_n
        self.flush_every_seconds = flush_every_seconds
        self._dirty = 0
        self._last_flush = time.monotonic()
        self.total_written = 0

    def _flush(self) -> None:
        if self._dirty == 0:
            return
        try:
            write_csv_atomic(self.csv_path, self.rows, self.fieldnames)
        except Exception:
            # Keep the writer alive so queue keeps draining; main will still join
            # cleanly. Rows already in memory; next successful flush persists them.
            logging.getLogger("personalize").exception("CSV flush failed; continuing")
            self._last_flush = time.monotonic()
            return
        self.total_written += self._dirty
        self._dirty = 0
        self._last_flush = time.monotonic()

    def run(self) -> None:
        while True:
            try:
                item = self.q.get(timeout=self.flush_every_seconds)
            except queue.Empty:
                self._flush()
                continue

            if item is self.SENTINEL:
                self._flush()
                return

            idx, personalization, status = item
            self.rows[idx][PERSONALIZATION_COL] = personalization
            self.rows[idx][STATUS_COL] = status
            self._dirty += 1
            if self._dirty >= self.flush_every_n:
                self._flush()
            elif time.monotonic() - self._last_flush >= self.flush_every_seconds:
                self._flush()


# ---------------------------- Logging ----------------------------

def setup_logging() -> logging.Logger:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("personalize")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    fh = logging.FileHandler(LOG_PATH, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    logger.addHandler(sh)
    return logger


# ---------------------------- Worker ----------------------------

def process_lead(
    idx: int,
    lead: dict,
    client: Anthropic,
    logger: logging.Logger,
) -> tuple[int, str, str]:
    """Research + synthesize one lead. Returns (idx, personalization, status).

    Never raises — any exception is caught, logged, and returned as STATUS_FAILED
    with an empty personalization so the row is retried on the next run.
    """
    try:
        context, source = research_lead(lead)
        line = synthesize_line(client, lead, context)
        if not line:
            logger.warning("row %d (%s): empty line from Haiku", idx, lead.get("Email"))
            return idx, "", STATUS_FAILED
        logger.info("row %d (%s) [%s]: %s", idx, lead.get("Email"), source, line)
        return idx, line, STATUS_DONE
    except Exception as exc:
        logger.exception("row %d (%s) failed: %s", idx, lead.get("Email"), exc)
        return idx, "", STATUS_FAILED


# ---------------------------- Main ----------------------------

def main() -> int:
    logger = setup_logging()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key or api_key.startswith("your_"):
        logger.error("ANTHROPIC_API_KEY not set in .env")
        return 1

    if not CSV_PATH.exists():
        logger.error("CSV not found: %s", CSV_PATH)
        return 1

    backup_once(CSV_PATH, BACKUP_PATH)
    logger.info("backup: %s", BACKUP_PATH)

    rows, fieldnames = load_leads(CSV_PATH)
    fieldnames = ensure_columns(rows, fieldnames)
    logger.info("loaded %d rows", len(rows))

    # Write once up front so the new columns land on disk even if we crash
    # before the writer thread flushes.
    write_csv_atomic(CSV_PATH, rows, fieldnames)

    pending_indices = [i for i, r in enumerate(rows) if r.get(STATUS_COL) != STATUS_DONE]
    logger.info("pending leads to process: %d / %d", len(pending_indices), len(rows))
    if not pending_indices:
        logger.info("nothing to do — all leads already done")
        return 0

    q: "queue.Queue[tuple[int, str, str] | object]" = queue.Queue()
    writer = WriterThread(rows, fieldnames, CSV_PATH, q)
    writer.start()

    client = Anthropic(api_key=api_key)
    t0 = time.perf_counter()
    processed = 0
    try:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            futures = [
                pool.submit(process_lead, i, rows[i], client, logger)
                for i in pending_indices
            ]
            for fut in as_completed(futures):
                idx, line, status = fut.result()
                q.put((idx, line, status))
                processed += 1
                if processed % 50 == 0:
                    elapsed = time.perf_counter() - t0
                    rate = processed / elapsed if elapsed else 0
                    remaining = len(pending_indices) - processed
                    eta = remaining / rate if rate else float("inf")
                    logger.info(
                        "progress: %d/%d (%.1f/s, ETA %.0fs)",
                        processed, len(pending_indices), rate, eta,
                    )
    except KeyboardInterrupt:
        logger.warning("KeyboardInterrupt — shutting down writer and saving progress")
    finally:
        q.put(WriterThread.SENTINEL)
        writer.join(timeout=30)
        total = time.perf_counter() - t0
        logger.info(
            "done: processed=%d written=%d elapsed=%.1fs",
            processed, writer.total_written, total,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
