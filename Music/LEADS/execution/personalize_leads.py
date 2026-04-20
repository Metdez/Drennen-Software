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

CSV_PATH = ROOT / "ZackBiz Owner Leads 4-4-26 - Sheet1.csv"
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
