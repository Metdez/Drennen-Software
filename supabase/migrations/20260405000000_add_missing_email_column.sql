-- The remote profiles table is missing the `email` column that the
-- handle_new_user() trigger expects. Add it so signups stop failing.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
