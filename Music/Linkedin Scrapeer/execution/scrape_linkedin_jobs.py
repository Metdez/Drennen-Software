import csv
import os
import sys
from datetime import datetime, timezone

from apify_client import ApifyClient
from dotenv import load_dotenv

load_dotenv()

APIFY_TOKEN = os.getenv("APIFY_API_TOKEN")
if not APIFY_TOKEN:
    print("ERROR: APIFY_API_TOKEN not set in .env")
    sys.exit(1)

ACTOR_ID = "happitap/linkedin-job-scraper"

SEARCH_TERMS = [
    "investment banking analyst",
    "mergers and acquisitions analyst",
]

MAX_JOBS_PER_TERM = 100
DATE_POSTED = "1d"
PROXY_COUNTRY = "US"
LOCATION = "United States"

CSV_COLUMNS = [
    "job_id",
    "title",
    "company",
    "company_url",
    "location",
    "url",
    "posted_at",
    "experience_level",
    "employment_type",
    "is_remote",
    "description_snippet",
    "scraped_at",
]


def run_actor(client, keyword):
    """Run the Apify actor for a single search term and return items."""
    print(f"  Searching: '{keyword}'...")
    run_input = {
        "keywords": [keyword],
        "location": LOCATION,
        "maxJobs": MAX_JOBS_PER_TERM,
        "datePosted": DATE_POSTED,
        "proxyCountry": PROXY_COUNTRY,
    }
    run = client.actor(ACTOR_ID).call(run_input=run_input)
    items = list(client.dataset(run["defaultDatasetId"]).iterate_items())
    print(f"    Found {len(items)} raw results")
    return items


def passes_title_filter(title):
    """Return True if title contains 'analyst' and does NOT contain 'associate'."""
    t = title.lower()
    return "analyst" in t and "associate" not in t


def normalize_item(item):
    """Convert raw Apify output to our CSV schema."""
    return {
        "job_id": item.get("jobId", ""),
        "title": item.get("jobTitle", ""),
        "company": item.get("companyName", ""),
        "company_url": item.get("companyUrl", ""),
        "location": item.get("location", ""),
        "url": item.get("jobUrl", ""),
        "posted_at": item.get("postedAt", ""),
        "experience_level": item.get("experienceLevel", ""),
        "employment_type": item.get("employmentType", ""),
        "is_remote": str(item.get("isRemote", False)),
        "description_snippet": item.get("jobDescription", "")[:200],
        "scraped_at": item.get("scrapedAt", ""),
    }


def main():
    client = ApifyClient(APIFY_TOKEN)
    all_items = []

    print("LinkedIn Job Scraper")
    print("=" * 40)

    for term in SEARCH_TERMS:
        try:
            items = run_actor(client, term)
            all_items.extend(items)
        except Exception as e:
            print(f"  ERROR running actor for '{term}': {e}")
            sys.exit(1)

    # Filter: must have "analyst" in title, must NOT have "associate"
    filtered = [item for item in all_items if passes_title_filter(item.get("jobTitle", ""))]
    print(f"\nAfter title filter (analyst only, no associate): {len(filtered)} jobs")

    # Deduplicate by job URL
    seen_urls = set()
    unique = []
    for item in filtered:
        url = item.get("jobUrl", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            unique.append(item)
    print(f"After deduplication: {len(unique)} jobs")

    # Normalize and write CSV
    rows = [normalize_item(item) for item in unique]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    output_path = os.path.join(".tmp", f"jobs_{today}.csv")
    os.makedirs(".tmp", exist_ok=True)

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nOutput: {output_path} ({len(rows)} jobs)")


if __name__ == "__main__":
    main()
