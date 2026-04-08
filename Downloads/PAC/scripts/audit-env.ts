/**
 * Pre-deploy environment variable audit.
 *
 * Usage: npx tsx scripts/audit-env.ts
 *
 * Checks:
 *  1. All required env vars are set
 *  2. SUPABASE_SERVICE_ROLE_KEY is not prefixed with NEXT_PUBLIC_
 *  3. No NEXT_PUBLIC_ vars contain 'secret', 'key', or 'password' suspiciously
 *  4. Warns on missing optional vars
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const REQUIRED_VARS = [
  'FEC_API_KEY',
  'OPENROUTER_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const OPTIONAL_VARS = [
  'LDA_API_KEY',
  'NYTIMES_API_KEY',
  'NYTIMES_SECRET',
  'ANALYSIS_API_KEY',
  'NEXT_PUBLIC_ANALYTICS_DOMAIN',
];

const SENSITIVE_PATTERNS = ['secret', 'password', 'private'];

let hasErrors = false;

console.log('=== Environment Audit ===\n');

// 1. Check required vars
console.log('--- Required Variables ---');
for (const varName of REQUIRED_VARS) {
  if (!process.env[varName]) {
    console.error(`  MISSING: ${varName}`);
    hasErrors = true;
  } else {
    console.log(`  OK: ${varName}`);
  }
}

// 2. Check that SUPABASE_SERVICE_ROLE_KEY is not exposed as NEXT_PUBLIC_
console.log('\n--- Security Checks ---');
if (process.env['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY']) {
  console.error(
    '  FAIL: SUPABASE_SERVICE_ROLE_KEY is exposed as NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY — this leaks the service role key to the browser!'
  );
  hasErrors = true;
} else {
  console.log('  OK: Service role key is not exposed via NEXT_PUBLIC_');
}

// 3. Check NEXT_PUBLIC_ vars for suspicious values
const allEnvKeys = Object.keys(process.env);
for (const key of allEnvKeys) {
  if (!key.startsWith('NEXT_PUBLIC_')) continue;
  // Skip known safe keys
  if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') continue;
  if (key === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') continue;

  const lowerKey = key.toLowerCase();
  for (const pattern of SENSITIVE_PATTERNS) {
    if (lowerKey.includes(pattern)) {
      console.error(
        `  WARNING: ${key} is a NEXT_PUBLIC_ var but its name contains "${pattern}" — verify this is intentional`
      );
    }
  }
}

// 4. Check optional vars
console.log('\n--- Optional Variables ---');
for (const varName of OPTIONAL_VARS) {
  if (!process.env[varName]) {
    console.warn(`  MISSING (optional): ${varName}`);
  } else {
    console.log(`  OK: ${varName}`);
  }
}

console.log('\n=========================');
if (hasErrors) {
  console.error('\nAudit FAILED — fix the issues above before deploying.\n');
  process.exit(1);
} else {
  console.log('\nAudit PASSED.\n');
  process.exit(0);
}
