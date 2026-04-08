/**
 * Production Smoke Test Script
 *
 * Usage:
 *   PROD_URL=https://thinktanktracker.org npx tsx scripts/smoke-test.ts
 *   npx tsx scripts/smoke-test.ts  # defaults to http://localhost:3000
 */

import { config } from "dotenv";

// Load .env.local for local testing
config({ path: ".env.local" });

const BASE_URL = (process.env.PROD_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);

const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function safeFetch(
  url: string
): Promise<{ status: number; body: string; headers: Headers } | null> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "SmokeTest/1.0" },
    });
    const body = await res.text();
    return { status: res.status, body, headers: res.headers };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return null;
  }
}

async function test(
  name: string,
  fn: () => Promise<void>
): Promise<void> {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(green(`  ✓ ${name}`));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: message });
    console.log(red(`  ✗ ${name}`));
    console.log(red(`    ${message}`));
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------

async function run() {
  console.log(`\nSmoke testing: ${BASE_URL}\n`);

  // 1. Homepage
  await test("GET / returns 200 with 'Think Tank'", async () => {
    const res = await safeFetch(`${BASE_URL}/`);
    assert(res !== null, "Connection failed");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(
      res.body.includes("Think Tank"),
      "Body does not contain 'Think Tank'"
    );
  });

  // 2. Heritage Foundation entity page
  await test(
    "GET /entity/heritage-foundation returns 200 with 'Heritage Foundation'",
    async () => {
      const res = await safeFetch(`${BASE_URL}/entity/heritage-foundation`);
      assert(res !== null, "Connection failed");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(
        res.body.includes("Heritage Foundation"),
        "Body does not contain 'Heritage Foundation'"
      );
    }
  );

  // 3. Brookings Institution entity page
  await test(
    "GET /entity/brookings-institution returns 200",
    async () => {
      const res = await safeFetch(`${BASE_URL}/entity/brookings-institution`);
      assert(res !== null, "Connection failed");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    }
  );

  // 4. Nonexistent entity returns 404
  await test(
    "GET /entity/nonexistent-entity-test returns 404",
    async () => {
      const res = await safeFetch(`${BASE_URL}/entity/nonexistent-entity-test`);
      assert(res !== null, "Connection failed");
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    }
  );

  // 5. Health endpoint
  await test(
    "GET /api/health returns 200 with 'status' field",
    async () => {
      const res = await safeFetch(`${BASE_URL}/api/health`);
      assert(res !== null, "Connection failed");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const json = JSON.parse(res.body);
      assert("status" in json, "JSON response missing 'status' field");
    }
  );

  // 6. Entity API
  await test(
    "GET /api/entity/heritage-foundation returns 200 with 'entity' field",
    async () => {
      const res = await safeFetch(
        `${BASE_URL}/api/entity/heritage-foundation`
      );
      assert(res !== null, "Connection failed");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const json = JSON.parse(res.body);
      assert("entity" in json, "JSON response missing 'entity' field");
    }
  );

  // 7. Search page
  await test("GET /search?q=climate returns 200", async () => {
    const res = await safeFetch(`${BASE_URL}/search?q=climate`);
    assert(res !== null, "Connection failed");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // 8. Sitemap
  await test(
    "GET /sitemap.xml returns 200 with 'entity/'",
    async () => {
      const res = await safeFetch(`${BASE_URL}/sitemap.xml`);
      assert(res !== null, "Connection failed");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(
        res.body.includes("entity/"),
        "Sitemap does not contain 'entity/'"
      );
    }
  );

  // 9. Robots.txt
  await test(
    "GET /robots.txt returns 200 with 'Sitemap:'",
    async () => {
      const res = await safeFetch(`${BASE_URL}/robots.txt`);
      assert(res !== null, "Connection failed");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(
        res.body.includes("Sitemap:"),
        "robots.txt does not contain 'Sitemap:'"
      );
    }
  );

  // 10. Security headers
  await test(
    "Security headers present on /",
    async () => {
      const res = await safeFetch(`${BASE_URL}/`);
      assert(res !== null, "Connection failed");
      const xfo = res.headers.get("x-frame-options");
      assert(xfo !== null, "Missing X-Frame-Options header");
      const xcto = res.headers.get("x-content-type-options");
      assert(xcto !== null, "Missing X-Content-Type-Options header");
    }
  );

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n${passed}/${total} tests passed\n`);

  process.exit(passed === total ? 0 : 1);
}

run();
