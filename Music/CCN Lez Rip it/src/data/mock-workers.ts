import type { Worker } from '@/types'

export const WORKERS: Worker[] = [
  { id: 'w_joe', name: 'Joe', departments: ['tables', 'assembly'] },
  { id: 'w_marco', name: 'Marco', departments: ['tables', 'case_goods'] },
  { id: 'w_dani', name: 'Dani', departments: ['case_goods', 'assembly'], specialties: ['corian'] },
  { id: 'w_lee', name: 'Lee', departments: ['case_goods'], specialties: ['corian'] },
  { id: 'w_pat', name: 'Pat', departments: ['veneer', 'press'] },
  { id: 'w_kim', name: 'Kim', departments: ['cnc', 'edge_banding'] },
  { id: 'w_sam', name: 'Sam', departments: ['sanding', 'hand_clamp'] },
  { id: 'w_alex', name: 'Alex', departments: ['finishing'] },
  { id: 'w_morgan', name: 'Morgan', departments: ['shipping', 'finishing'] },
  { id: 'w_taylor', name: 'Taylor', departments: ['engineering'] },
]
