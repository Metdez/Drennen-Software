import { createAdminClient } from '@/lib/supabase/server'

const BUCKET = 'temp-uploads'

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
