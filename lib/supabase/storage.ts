import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/server'

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

/** Download a ZIP from storage as a Buffer (server-side, admin client). */
export async function downloadTempZip(storagePath: string): Promise<Buffer> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath)
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)
  return Buffer.from(await data.arrayBuffer())
}

/** Delete a temp ZIP from storage (server-side, admin client). */
export async function deleteTempZip(storagePath: string): Promise<void> {
  const admin = createAdminClient()
  await admin.storage.from(BUCKET).remove([storagePath])
}
