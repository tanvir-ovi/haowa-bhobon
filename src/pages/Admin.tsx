import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChefHat, ChevronDown, ClipboardList, Moon, ShoppingBasket } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useAbsences, useBazar, useMeals, useTick } from '../hooks/useData'
import MonthPicker from '../components/MonthPicker'
import Avatar from '../components/Avatar'
import { dhakaNow, monthOf, resolveMeal, dayLabel } from '../lib/utils'
import { fmtPaisa } from '../lib/money'
import type { BazarEntry } from '../types'

export default function Admin() {
  const { activeMembers } = useAuth()
  useTick(30000)
  const now = dhakaNow()
  const [date, setDate] = useState(now.date)
  const { meals } = useMeals(monthOf(date))
  const { absences } = useAbsences()
  const [bazarMonth, setBazarMonth] = useState(monthOf(now.date))
  const { entries } = useBazar(bazarMonth)
  const [expanded, setExpanded] = useState<string | null>(null)

  const board = activeMembers.map((m) => ({
    member: m,
    r: resolveMeal(meals, absences, m.email, date),
    away: absences.some(
      (a) => a.email === m.email && a.startDate <= date && (!a.endDate || date <= a.endDate),
    ),
  }))
  const lunchPlates = board.reduce((s, b) => s + (b.r.lunch ? 1 : 0) + b.r.guestsLunch, 0)
  const dinnerPlates = board.reduce((s, b) => s + (b.r.dinner ? 1 : 0) + b.r.guestsDinner, 0)
  const guestTotal = board.reduce((s, b) => s + b.r.guestsLunch + b.r.guestsDinner, 0)

  const bazarByMember = useMemo(() => {
    const map = new Map<string, { totalPaisa: number; list: BazarEntry[] }>()
    for (const e of entries) {
      const g = map.get(e.email) ?? { totalPaisa: 0, list: [] }
      g.totalPaisa += e.totalPaisa || 0
      g.list.push(e)
      map.set(e.email, g)
    }
    return activeMembers
      .map((m) => ({ member: m, ...(map.get(m.email) ?? { totalPaisa: 0, list: [] }) }))
      .sort((a, b) => b.totalPaisa - a.totalPaisa)
  }, [entries, activeMembers])

  const grandPaisa = entries.reduce((s, e) => s + (e.totalPaisa || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Admin Overview 🛡️</h1>
        <p className="text-sm text-ink/50 font-medium">
          Only admins can see this page.
        </p>
      </div>

      {/* Meal board */}
      <motion.div className="card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-extrabold flex items-center gap-2">
            <ClipboardList size={18} className="text-brand-500" /> Meal board — {dayLabel(date)}
          </h2>
          <input
            className="input !w-auto py-1.5 no-print"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className="chip bg-brand-50 text-brand-700 text-sm">🍛 Lunch {lunchPlates} plates</span>
          <span className="chip bg-mteal-500/10 text-mteal-600 text-sm">🍲 Dinner {dinnerPlates} plates</span>
          <span className="chip bg-sun-300/50 text-amber-800 text-sm">🍽️ Guests {guestTotal}</span>
          <span className="chip bg-ink/5 text-ink/55 text-sm">
            <ChefHat size={12} /> incl. guests
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          {board.map(({ member: m, r, away }, i) => (
            <motion.div
              key={m.email}
              className="flex items-center gap-3 rounded-2xl bg-ink/3 px-3 py-2.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Avatar name={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm truncate">{m.nickname}</span>
                {away && (
                  <span className="chip bg-violet-100 text-violet-700 ml-2 !py-0.5">
                    <Moon size={10} /> away
                  </span>
                )}
              </div>
              <span
                className={`chip ${r.lunch ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}
              >
                🍛 {r.lunch ? 'ON' : 'OFF'}
                {r.guestsLunch > 0 && ` +${r.guestsLunch}`}
              </span>
              <span
                className={`chip ${r.dinner ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}
              >
                🍲 {r.dinner ? 'ON' : 'OFF'}
                {r.guestsDinner > 0 && ` +${r.guestsDinner}`}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Bazar breakdown */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-extrabold flex items-center gap-2">
            <ShoppingBasket size={18} className="text-mteal-500" /> Bazar by member
            <span className="chip bg-brand-50 text-brand-700">{fmtPaisa(grandPaisa)}</span>
          </h2>
          <MonthPicker month={bazarMonth} onChange={setBazarMonth} />
        </div>

        <div className="space-y-2">
          {bazarByMember.map(({ member: m, totalPaisa, list }) => {
            const open = expanded === m.email
            return (
              <div key={m.email} className="rounded-2xl border border-ink/8 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-ink/3 transition text-left"
                  onClick={() => setExpanded(open ? null : m.email)}
                >
                  <Avatar name={m.name} size="sm" />
                  <span className="font-bold text-sm flex-1 truncate">{m.nickname}</span>
                  <span className="text-xs font-semibold text-ink/40">
                    {list.length} {list.length === 1 ? 'entry' : 'entries'}
                  </span>
                  <span className="font-extrabold text-sm text-mteal-600">{fmtPaisa(totalPaisa)}</span>
                  <ChevronDown
                    size={16}
                    className={`text-ink/35 transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                {open && (
                  <motion.div
                    className="px-3 pb-3 space-y-2 bg-ink/2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    {list.length === 0 ? (
                      <p className="text-xs text-ink/40 font-semibold pt-2">
                        No bazar this month.
                      </p>
                    ) : (
                      list.map((e) => (
                        <div key={e.id} className="rounded-xl bg-white border border-ink/6 p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-extrabold text-ink/55">{dayLabel(e.date)}</span>
                            <span className="text-sm font-extrabold text-brand-600">
                              {fmtPaisa(e.totalPaisa)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {e.items.map((it, i) => (
                              <span key={i} className="chip bg-ink/4 text-ink/70 !text-[11px]">
                                {it.emoji} {it.name} · {it.qty} {it.unit} · {fmtPaisa(it.pricePaisa)}
                              </span>
                            ))}
                          </div>
                          {e.note && (
                            <div className="text-[11px] text-ink/45 font-medium mt-1.5">📝 {e.note}</div>
                          )}
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
