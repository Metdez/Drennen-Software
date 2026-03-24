# AGENT-DEPLOY.md — Agent 01: Project Scaffold
# Wave 1 agent. This fires FIRST, before any other agent.
# Your output is the foundation every other agent builds on.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md ← the full file tree is your blueprint
3. ERRORS.md
4. ENV.md ← for the .env.example variable names

---

## YOUR JOB

Initialize the Next.js project with all configuration files. You own these files and ONLY these files:

```
package.json
tsconfig.json
next.config.ts
tailwind.config.ts
postcss.config.js
.gitignore
.env.example
```

Do NOT create any `app/`, `lib/`, `components/`, or `types/` files. Leave those directories empty with just a `.gitkeep` if needed. Other agents own those.

---

## package.json

Use the exact dependency list from STRUCTURE.md. Do not add, remove, or change versions without a reason documented in DECISIONS.md.

Key scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

---

## tsconfig.json

Strict TypeScript. No exceptions.

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## next.config.ts

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
}

export default nextConfig
```

The `serverComponentsExternalPackages` config is required for `pdf-parse` and `mammoth` to work correctly in Next.js App Router server components. Without it, they may fail to load their file dependencies.

---

## tailwind.config.ts

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#f36f21',
          purple: '#542785',
          green: '#0f6b37',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

## .gitignore

```
# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files — NEVER COMMIT THESE
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# planning docs with real secrets
docs/ENV.md

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
```

---

## COMPLETION CHECKLIST

- [ ] `package.json` — all deps from STRUCTURE.md, correct scripts
- [ ] `tsconfig.json` — strict mode, @/* path alias
- [ ] `next.config.ts` — serverComponentsExternalPackages set
- [ ] `tailwind.config.ts` — brand color tokens defined
- [ ] `postcss.config.js` — standard Tailwind PostCSS config
- [ ] `.gitignore` — includes `.env.local`, `docs/ENV.md`
- [ ] `.env.example` — placeholder values, no real keys
- [ ] Run `npm install` and confirm it completes without errors
- [ ] Run `npx tsc --noEmit` — should report "no input files" or pass clean (no app code yet)
