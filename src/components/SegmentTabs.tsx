import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

export interface SegTab<T extends string> {
  id: T
  label: string
  icon: LucideIcon
}

// Facebook-style segmented tab bar: keeps busy pages one-section-at-a-time.
export default function SegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
  layoutId,
}: {
  tabs: SegTab<T>[]
  value: T
  onChange: (t: T) => void
  layoutId: string
}) {
  return (
    <div className="card p-1.5 flex gap-1 no-print sticky top-[4.5rem] lg:top-2 z-30">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`relative flex-1 flex items-center justify-center gap-1.5 rounded-2xl px-1.5 py-2.5
            text-[11px] sm:text-sm font-bold transition ${value === id ? 'text-white' : 'text-ink/50 hover:text-ink'}`}
        >
          {value === id && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <Icon size={15} className="relative z-10 shrink-0" />
          <span className="relative z-10 truncate">{label}</span>
        </button>
      ))}
    </div>
  )
}
