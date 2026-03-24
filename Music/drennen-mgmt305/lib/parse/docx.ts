import mammoth from 'mammoth'

export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  } catch {
    return '' // If a file fails to parse, return empty — don't crash the whole batch
  }
}
