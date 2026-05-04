import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DragValidationFailure } from '@/types'

const FAIL_LABEL: Record<DragValidationFailure['type'], string> = {
  hard_date: 'Customer hard date',
  shortage: 'Material shortage',
  capacity: 'Department capacity',
  engineering: 'Engineering readiness',
}

export function DragWarningModal({
  open,
  failures,
  onCancel,
  onOverride,
}: {
  open: boolean
  failures: DragValidationFailure[]
  onCancel: () => void
  onOverride: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) setReason('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            This move breaks a rule
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-3 text-sm">
          {failures.map((failure, index) => (
            <li key={`${failure.type}-${index}`} className="rounded border border-red-200 bg-red-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-red-700">{FAIL_LABEL[failure.type]}</div>
              <div className="mt-1 text-slate-900">{failure.message}</div>
              {failure.details && <div className="mt-1 text-xs text-slate-600">{failure.details}</div>}
            </li>
          ))}
        </ul>
        <div>
          <label className="text-xs font-medium text-slate-700">Override reason (required)</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none ring-blue-500 focus:ring-2"
            rows={2}
            placeholder="e.g. Tim approved overtime and Lori confirmed revised customer date"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel move</Button>
          <Button variant="destructive" onClick={() => onOverride(reason.trim())} disabled={!reason.trim()}>
            Override anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
