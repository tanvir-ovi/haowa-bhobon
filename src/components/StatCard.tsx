import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export default function StatCard({
  icon,
  label,
  value,
  sub,
  accent = 'brand',
  delay = 0,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  accent?: 'brand' | 'teal' | 'sun' | 'ink'
  delay?: number
}) {
  const accents: Record<string, string> = {
    brand: 'from-brand-500 to-brand-700 shadow-brand-500/30',
    teal: 'from-mteal-500 to-mteal-700 shadow-mteal-500/30',
    sun: 'from-sun-500 to-amber-600 shadow-sun-500/30',
    ink: 'from-slate-600 to-slate-800 shadow-slate-500/30',
  }
  return (
    <motion.div
      className="card p-5 flex items-center gap-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accents[accent]}
          text-white flex items-center justify-center shadow-lg shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold uppercase tracking-wider text-ink/45">{label}</div>
        <div className="text-xl font-extrabold truncate">{value}</div>
        {sub && <div className="text-xs text-ink/50 font-medium">{sub}</div>}
      </div>
    </motion.div>
  )
}
