import type { ShortagePart } from '@/types'

export function ShortageList({ shortages }: { shortages: ShortagePart[] }) {
  if (shortages.length === 0) {
    return <p className="text-xs text-slate-500">No outstanding parts.</p>
  }
  return (
    <table className="w-full text-xs">
      <thead className="text-slate-500">
        <tr>
          <th className="py-1 text-left font-medium">Part</th>
          <th className="py-1 text-left font-medium">Vendor</th>
          <th className="py-1 text-right font-medium">Qty</th>
          <th className="py-1 text-right font-medium">ETA</th>
        </tr>
      </thead>
      <tbody>
        {shortages.map((shortage) => (
          <tr key={`${shortage.partName}-${shortage.vendor}`} className="border-t border-slate-100">
            <td className="py-1.5 text-slate-800">{shortage.partName}</td>
            <td className="py-1.5 text-slate-600">{shortage.vendor}</td>
            <td className="py-1.5 text-right font-mono text-slate-800">{shortage.qty}</td>
            <td className="py-1.5 text-right font-mono font-medium text-red-700">{shortage.etaDate}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
