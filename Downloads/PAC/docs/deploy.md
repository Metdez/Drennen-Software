# scripts/deploy.ts

Pre-deploy checklist that runs 5 sequential checks and reports pass/fail.

## What it does

Executes these checks in order, printing a status line for each:

1. **Environment audit** -- runs `scripts/audit-env.ts` to verify env vars
2. **npm audit** -- checks for high/critical vulnerabilities
3. **TypeScript typecheck** -- `tsc --noEmit`
4. **Next.js build** -- `npm run build`
5. **ESLint** -- `npm run lint`

## Usage

```bash
npx tsx scripts/deploy.ts
```

## Dependencies

- `dotenv` (loaded by audit-env.ts)
- `tsx` (dev dependency)
- Node.js `child_process.execSync`

## Exit codes

- `0` -- all checks pass ("Ready to deploy")
- `1` -- one or more blockers found

## Known limitations

- Runs checks sequentially; a build failure means lint does not run
- Does not actually trigger a Vercel deployment
