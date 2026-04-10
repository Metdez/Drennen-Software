# app/(auth)/ — Authentication Entry Points

This route group is the narrow login surface for the app.

## What Lives Here

- `login/` — email/password sign-in form and auth flow entry point.

## Conventions

- Keep auth UI small and explicit.
- Use the shared Supabase client/auth helpers instead of ad hoc session logic.
- Redirect users back into the app shell once authentication succeeds.

