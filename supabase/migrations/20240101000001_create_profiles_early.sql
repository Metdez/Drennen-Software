-- 20240102 adds a policy on public.profiles, but the table was only created in 20240103.
-- Create it first so a from-scratch `supabase db reset` works; 20240103 is IF NOT EXISTS-safe.
CREATE TABLE IF NOT EXISTS public.profiles (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
