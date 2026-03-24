-- RLS policies for the temp-uploads storage bucket
-- Authenticated users can upload only to their own folder (userId/)
-- Service role can read and delete (for server-side processing and cleanup)

CREATE POLICY "authenticated_upload_own_folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'temp-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "service_role_select"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'temp-uploads');

CREATE POLICY "service_role_delete"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'temp-uploads');
