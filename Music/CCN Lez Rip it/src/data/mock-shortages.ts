import { JOBS } from './mock-jobs'

export const SHORTAGES = JOBS.flatMap((job) =>
  job.shortages.map((shortage) => ({
    ...shortage,
    jobId: job.id,
    mfgNumber: job.mfgNumber,
    customerId: job.customerId,
  })),
)
