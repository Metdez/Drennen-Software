import type { Department } from '@/types'

export const DEPARTMENTS: Department[] = [
  { id: 'engineering', code: 'ENG', name: 'Engineering', weeklyCapacityHours: 120 },
  { id: 'veneer', code: 'VNR', name: 'Veneer Cutting', weeklyCapacityHours: 80 },
  { id: 'press', code: 'MTL', name: 'Press', weeklyCapacityHours: 80 },
  { id: 'cnc', code: 'NC', name: 'CNC', weeklyCapacityHours: 100 },
  { id: 'edge_banding', code: 'EDGE', name: 'Edge Banding', weeklyCapacityHours: 60 },
  { id: 'sanding', code: 'HS', name: 'Sanding', weeklyCapacityHours: 80 },
  { id: 'tables', code: 'TB', name: 'Tables', weeklyCapacityHours: 200 },
  { id: 'case_goods', code: 'AA', name: 'Case Goods', weeklyCapacityHours: 120 },
  { id: 'hand_clamp', code: 'HC', name: 'Hand Clamping', weeklyCapacityHours: 60 },
  { id: 'assembly', code: 'ASM', name: 'Assembly', weeklyCapacityHours: 140 },
  { id: 'finishing', code: 'FF', name: 'Finishing', weeklyCapacityHours: 120 },
  { id: 'shipping', code: 'PP', name: 'Shipping', weeklyCapacityHours: 60 },
]
