# ENV.md — Environment Variables
# ⚠️  THIS FILE IS GITIGNORED. NEVER COMMIT IT. NEVER SHARE IT.
# Add docs/ENV.md to .gitignore immediately.
#
# This file contains the real values for all environment variables.
# Agents read this file to know the exact variable names.
# When deploying to Vercel, copy these values into the Vercel dashboard manually.

---

## ⚠️  SECURITY RULES FOR AGENTS

1. NEVER log environment variables to the console
2. NEVER include env var values in error messages returned to the client
3. NEVER import env vars in any file inside `components/` or client-side code
4. ALL env var access happens in `lib/` files or `app/api/` route handlers only
5. The XAI_API_KEY may only be imported in `lib/ai/client.ts` — nowhere else
6. The SUPABASE_SERVICE_ROLE_KEY may only be used in `lib/supabase/server.ts` — nowhere else
7. The NEXT_PUBLIC_* vars are safe for client-side use (they're designed for it)

---

## .env.local (copy this entire block to your .env.local file)

```env
# ─── Supabase ────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── xAI ─────────────────────────────────────────────────────
XAI_API_KEY=your-xai-api-key
XAI_BASE_URL=https://api.x.ai/v1
XAI_MODEL=grok-4-1-fast-reasoning
```

---

## VARIABLE REFERENCE TABLE

| Variable | Scope | Used In | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (client + server) | `lib/supabase/client.ts` `lib/supabase/server.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (client + server) | `lib/supabase/client.ts` `lib/supabase/server.ts` | Supabase anon/public key — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | `lib/supabase/server.ts` only | Supabase service role — bypasses RLS, never expose |
| `XAI_API_KEY` | Server only | `lib/ai/client.ts` only | xAI API key — never expose to client |
| `XAI_BASE_URL` | Server only | `lib/ai/client.ts` only | xAI OpenAI-compatible endpoint |
| `XAI_MODEL` | Server only | `lib/ai/client.ts` only | Model name to use for generation |

---

## .env.example (safe to commit — placeholder values only)

Agent 12 creates this file at the project root. It looks like this:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# xAI
XAI_API_KEY=your-xai-api-key
XAI_BASE_URL=https://api.x.ai/v1
XAI_MODEL=grok-4-1-fast-reasoning
```

---

## VERCEL DEPLOYMENT

When deploying, add all variables in the Vercel dashboard under:
**Project → Settings → Environment Variables**

Set each variable for: Production, Preview, and Development environments.
NEXT_PUBLIC_* vars must be set as "Client" accessible.
All others must be set as "Server" only.
