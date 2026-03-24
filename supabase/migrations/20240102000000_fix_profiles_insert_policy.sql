-- Fix: Allow inserts into profiles table
-- The handle_new_user trigger needs to insert into profiles when a new user signs up,
-- but RLS was blocking it because no INSERT policy existed.
CREATE POLICY "allow_trigger_insert"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);
