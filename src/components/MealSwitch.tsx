import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'

export default function MealSwitch({
  label,
  emoji,
  on,
  locked,
  hint,
  onToggle,
}: {
  label: string
  emoji: string
  on: boolean
  locked: boolean
  hint?: string
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      disabled={locked}
      className={`flex-1 rounded-2xl p-4 text-left transition-all duration-300 border-2 relative
        ${on
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400/60'
          : 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-300/60'}
        ${locked ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        <div
          className={`w-12 h-7 rounded-full p-1 flex transition-colors duration-300
            ${on ? 'bg-emerald-500 justify-end' : 'bg-rose-400 justify-start'}`}
        >
          <motion.div
            layout
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-5 h-5 rounded-full bg-white shadow"
          />
        </div>
      </div>
      <div className="mt-2 font-extrabold text-sm">{label}</div>
      <div
        className={`text-xs font-bold ${on ? 'text-emerald-600' : 'text-rose-500'}`}
      >
        {on ? 'ON' : 'OFF'}
      </div>
      {hint && (
        <div className="mt-1 text-[11px] font-semibold text-ink/45 flex items-center gap-1">
          {locked && <Lock size={10} />}
          {hint}
        </div>
      )}
    </button>
  )
}
