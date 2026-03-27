import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { SemesterReport, SemesterReportRow, ReportConfig, ReportContent } from '@/types'

function rowToReport(row: SemesterReportRow): SemesterReport {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    config: row.config,
    content: row.content,
    sessionIds: row.session_ids,
    createdAt: row.created_at,
  }
}

/** Insert a new semester report (admin context) */
export async function insertReport(
  userId: string,
  title: string,
  config: ReportConfig,
  content: ReportContent,
  sessionIds: string[]
): Promise<SemesterReport> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semester_reports')
    .insert({
      user_id: userId,
      title,
      config,
      content,
      session_ids: sessionIds,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to insert report: ${error.message}`)
  return rowToReport(data as SemesterReportRow)
}

/** Get a report by ID (RLS-protected) */
export async function getReportById(id: string): Promise<SemesterReport | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('semester_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  return rowToReport(data as SemesterReportRow)
}

/** List all reports for a user (RLS-protected), newest first */
export async function listReports(): Promise<SemesterReport[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('semester_reports')
    .select('*')
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data.map((row: SemesterReportRow) => rowToReport(row))
}
