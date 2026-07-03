import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthLabel, nextMonth, prevMonth, dhakaNow, monthOf } from '../lib/utils'

export default function MonthPicker({
  month,
  onChange,
}: {
  month: string
  onChange: (m: string) => void
}) {
  const current = monthOf(dhakaNow().date)
  return (
    <div className="inline-flex items-center gap-1 card px-1.5 py-1.5 no-print">
      <button className="btn-ghost p-2 rounded-xl" onClick={() => onChange(prevMonth(month))}>
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-36 text-center font-bold text-sm">{monthLabel(month)}</span>
      <button
        className="btn-ghost p-2 rounded-xl"
        onClick={() => onChange(nextMonth(month))}
        disabled={month >= current}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
