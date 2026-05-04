export type WeekIndex = 1 | 2 | 3 | 4

export type DepartmentId =
  | 'engineering'
  | 'veneer'
  | 'press'
  | 'cnc'
  | 'edge_banding'
  | 'sanding'
  | 'tables'
  | 'case_goods'
  | 'hand_clamp'
  | 'assembly'
  | 'finishing'
  | 'shipping'

export interface Department {
  id: DepartmentId
  code: string
  name: string
  weeklyCapacityHours: number
}

export interface Worker {
  id: string
  name: string
  departments: DepartmentId[]
  specialties?: string[]
}

export interface Customer {
  id: string
  name: string
}

export type JobStatus = 'healthy' | 'warning' | 'blocked' | 'hold' | 'acknowledged'

export interface ShortagePart {
  partName: string
  vendor: string
  qty: number
  etaDate: string
  critical: boolean
  poNumber?: string
}

export interface DepartmentHours {
  departmentId: DepartmentId
  hours: number
  workerIds: string[]
}

export interface AuditEntry {
  date: string
  user: string
  action: string
  reason?: string
}

export interface Job {
  id: string
  mfgNumber: string
  customerId: string
  contractTitle: string
  squareFootage: number
  shipDate: string
  shipWeek: WeekIndex
  hardCustomerDate?: string
  hardDateNote?: string
  loriNote?: string
  status: JobStatus
  drawingsApprovedDate?: string
  bomCompleteDate?: string
  vendorAckDate?: string
  drafter?: string
  bomCompletionPercent?: number
  shortages: ShortagePart[]
  departmentHours: DepartmentHours[]
  auditLog: AuditEntry[]
}

export interface DeptWeekCapacity {
  departmentId: DepartmentId
  week: WeekIndex
  scheduledHours: number
  capacityHours: number
  utilizationPercent: number
  status: 'green' | 'amber' | 'red'
}

export type DragValidationFailureType = 'hard_date' | 'shortage' | 'capacity' | 'engineering'

export interface DragValidationFailure {
  type: DragValidationFailureType
  message: string
  details?: string
}

export type DragValidationResult =
  | { ok: true }
  | { ok: false; failures: DragValidationFailure[] }
