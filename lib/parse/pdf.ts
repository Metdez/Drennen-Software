import pdfParse from 'pdf-parse'

export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer)
    return result.text.trim()
  } catch {
    return '' // If a file fails to parse, return empty — don't crash the whole batch
  }
}
