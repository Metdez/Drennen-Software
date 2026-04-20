import personalize_leads as p


class TestEmailDomain:
    def test_business_email_returns_domain(self):
        assert p.email_domain("sales@paradigmparachute.com") == "paradigmparachute.com"

    def test_gmail_returns_none(self):
        assert p.email_domain("davis.carroll12@gmail.com") is None

    def test_yahoo_returns_none(self):
        assert p.email_domain("foo@YAHOO.com") is None

    def test_empty_returns_none(self):
        assert p.email_domain("") is None

    def test_malformed_returns_none(self):
        assert p.email_domain("notanemail") is None

    def test_uppercase_business_domain_lowercased(self):
        assert p.email_domain("info@ACME.COM") == "acme.com"


class TestIsAggregator:
    def test_linkedin_is_aggregator(self):
        assert p.is_aggregator("https://www.linkedin.com/in/foo")

    def test_facebook_is_aggregator(self):
        assert p.is_aggregator("https://facebook.com/company/bar")

    def test_real_business_site_is_not_aggregator(self):
        assert not p.is_aggregator("https://paradigmparachute.com/about")

    def test_garbage_input_is_aggregator(self):
        assert p.is_aggregator("not-a-url")


class TestExtractText:
    def test_strips_scripts_and_collapses_whitespace(self):
        html = "<html><body><script>alert('x')</script>  Hello\n\n  World  </body></html>"
        assert p.extract_text(html) == "Hello World"

    def test_removes_nav_footer(self):
        html = "<html><body><nav>MENU</nav><p>Main content</p><footer>(c) 2026</footer></body></html>"
        assert "MENU" not in p.extract_text(html)
        assert "2026" not in p.extract_text(html)
        assert "Main content" in p.extract_text(html)


class TestUnwrapDdgUrl:
    def test_unwraps_encoded_redirect(self):
        href = "/l/?uddg=https%3A%2F%2Fparadigmparachute.com%2F&rut=abc"
        assert p.unwrap_ddg_url(href) == "https://paradigmparachute.com/"

    def test_passes_through_absolute_url(self):
        assert p.unwrap_ddg_url("https://example.com/x") == "https://example.com/x"

    def test_returns_none_for_relative_non_redirect(self):
        assert p.unwrap_ddg_url("/foo/bar") is None


import httpx
import pytest
import respx


class TestFetchBusinessSite:
    @respx.mock
    def test_combines_homepage_and_about(self):
        p._scrape_client = None  # reset shared client for clean mock state
        respx.get("https://example.com/").mock(
            return_value=httpx.Response(
                200,
                headers={"content-type": "text/html"},
                text="<html><body><p>Welcome to example</p></body></html>",
            )
        )
        respx.get("https://example.com/about").mock(
            return_value=httpx.Response(
                200,
                headers={"content-type": "text/html"},
                text="<html><body><p>Founded in 1994</p></body></html>",
            )
        )
        respx.get("https://example.com/about-us").mock(
            return_value=httpx.Response(404),
        )
        text = p.fetch_business_site("example.com")
        assert "Welcome to example" in text
        assert "Founded in 1994" in text
        assert "[https://example.com]" in text

    @respx.mock
    def test_returns_empty_when_all_fail(self):
        p._scrape_client = None
        respx.get("https://nothing.test/").mock(return_value=httpx.Response(404))
        respx.get("https://nothing.test/about").mock(return_value=httpx.Response(404))
        respx.get("https://nothing.test/about-us").mock(return_value=httpx.Response(404))
        assert p.fetch_business_site("nothing.test") == ""


class TestDuckDuckGoSearch:
    @respx.mock
    def test_parses_and_unwraps_results(self):
        p._scrape_client = None
        html = """
        <html><body>
          <a class="result__a" href="/l/?uddg=https%3A%2F%2Fparadigmparachute.com%2F">Paradigm</a>
          <a class="result__a" href="/l/?uddg=https%3A%2F%2Fwww.linkedin.com%2Fin%2Ffoo">LinkedIn</a>
          <a class="other">ignored</a>
        </body></html>
        """
        respx.get(url__startswith="https://html.duckduckgo.com/html/").mock(
            return_value=httpx.Response(
                200, headers={"content-type": "text/html"}, text=html
            )
        )
        urls = p.duckduckgo_search('"Paradigm" Pensacola FL')
        assert urls == ["https://paradigmparachute.com/", "https://www.linkedin.com/in/foo"]


class TestEnsureColumns:
    def test_adds_both_columns_when_absent(self):
        rows = [{"Email": "a@b.com"}, {"Email": "c@d.com"}]
        fieldnames = ["Email"]
        updated = p.ensure_columns(rows, fieldnames)
        assert updated == ["Email", "Personalization", "Status"]
        assert all(r["Personalization"] == "" for r in rows)
        assert all(r["Status"] == "pending" for r in rows)

    def test_preserves_existing_done_status(self):
        rows = [
            {"Email": "a@b.com", "Personalization": "already written", "Status": "done"},
            {"Email": "c@d.com"},
        ]
        fieldnames = ["Email", "Personalization", "Status"]
        p.ensure_columns(rows, fieldnames)
        assert rows[0]["Status"] == "done"
        assert rows[0]["Personalization"] == "already written"
        assert rows[1]["Status"] == "pending"
        assert rows[1]["Personalization"] == ""

    def test_adds_only_missing_column(self):
        rows = [{"Email": "a@b.com", "Status": "done"}]
        fieldnames = ["Email", "Status"]
        updated = p.ensure_columns(rows, fieldnames)
        assert updated == ["Email", "Status", "Personalization"]
        assert rows[0]["Personalization"] == ""
        assert rows[0]["Status"] == "done"


class TestBackupOnce:
    def test_creates_backup_once_then_noop(self, tmp_path):
        src = tmp_path / "src.csv"
        src.write_text("original")
        bak = tmp_path / "src.csv.bak"
        p.backup_once(src, bak)
        assert bak.read_text() == "original"
        src.write_text("MUTATED")
        p.backup_once(src, bak)
        assert bak.read_text() == "original"  # still original, not overwritten
