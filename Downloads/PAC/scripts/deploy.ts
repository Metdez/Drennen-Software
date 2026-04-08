/**
 * Pre-deploy checklist script.
 *
 * Usage: npx tsx scripts/deploy.ts
 *
 * Runs 5 checks in sequence:
 *  1. Environment variable audit (via audit-env.ts logic)
 *  2. npm audit for high/critical vulnerabilities
 *  3. TypeScript typecheck (tsc --noEmit)
 *  4. Next.js build
 *  5. ESLint lint
 *
 * Reports pass/fail for each check and exits with code 0 (all pass) or 1 (any fail).
 * Does NOT actually deploy.
 */

import { execSync } from 'child_process';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

interface CheckResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: CheckResult[] = [];

function runCheck(name: string, command: string): void {
  process.stdout.write(`\nRunning: ${name}...\n`);
  try {
    execSync(command, { cwd: ROOT, stdio: 'pipe', encoding: 'utf-8' });
    results.push({ name, passed: true });
    console.log(`  \u2713 ${name}`);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, error: message });
    console.error(`  \u2717 ${name}`);
  }
}

console.log('=== Pre-Deploy Checklist ===');

// 1. Environment variable audit
runCheck('Environment audit', 'npx tsx scripts/audit-env.ts');

// 2. Security audit
runCheck('npm audit (high+)', 'npm audit --audit-level=high');

// 3. TypeScript typecheck
runCheck('TypeScript typecheck', 'npx tsc --noEmit');

// 4. Build
runCheck('Next.js build', 'npm run build');

// 5. Lint
runCheck('ESLint', 'npm run lint');

// Summary
console.log('\n=== Summary ===\n');

const failures = results.filter((r) => !r.passed);

for (const r of results) {
  console.log(`  ${r.passed ? '\u2713' : '\u2717'} ${r.name}`);
}

console.log('');

if (failures.length === 0) {
  console.log('Ready to deploy \u2713\n');
  process.exit(0);
} else {
  console.log(`${failures.length} blocker(s) found\n`);
  process.exit(1);
}
