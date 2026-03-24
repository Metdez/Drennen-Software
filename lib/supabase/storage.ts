import { createClient } from '@/lib/supabase/client'

const BUCKET = 'temp-uploads'

/** Upload a ZIP file from the browser to Supabase Storage. Returns the storage path. */
export async function uploadTempZip(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${userId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: 'application/zip',
    upsert: false,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}
