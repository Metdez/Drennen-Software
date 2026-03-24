import unzipper from 'unzipper'

export interface ZipEntry {
  filename: string
  buffer: Buffer
  extension: string
}

export async function extractZip(zipBuffer: Buffer): Promise<ZipEntry[]> {
  const directory = await unzipper.Open.buffer(zipBuffer)

  const entries: ZipEntry[] = []

  for (const file of directory.files) {
    // Skip Mac junk files and directories
    if (file.path.startsWith('__MACOSX') || file.path.endsWith('/')) continue

    const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'docx'].includes(ext)) continue

    const buffer = await file.buffer()
    entries.push({
      filename: file.path,
      buffer,
      extension: ext,
    })
  }

  return entries
}
