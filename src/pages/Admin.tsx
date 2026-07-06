import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
} from 'firebase/firestore'
import {
  Check,
  ChefHat,
  ChevronDown,
  ClipboardList,
  Moon,
  Pencil,
  Plus,
  ShoppingBasket,
  Sparkles,
  Trash2,
  Undo2,
} from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAbsences, useBazar, useCleaning, useMeals, useTick } from '../hooks/useData'
import MonthPicker from '../components/MonthPicker'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import SegmentTabs from '../components/SegmentTabs'
import { dhakaNow, monthOf, resolveMeal, nickFromId, dayLabel } from '../lib/utils'
import { fmtPaisa } from '../lib/money'
import type { BazarEntry, CleaningDoc } from '../types'

type Tab = 'meals' | 'bazar' | 'cleaning'

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'meals', label: 'Meal Board', icon: ClipboardList },
  { id: 'bazar', label: 'Bazar', icon: ShoppingBasket },
  { id: 'cleaning', label: 'Cleaning', icon: Sparkles },
]

export default function Admin() {
  const { activeMembers, members } = useAuth()
  useTick(30000)
  const now = dhakaNow()
  const [tab, setTab] = useState<Tab>('meals')

  // Meal board
  const [date, setDate] = useState(now.date)
  const { meals } = useMeals(monthOf(date))
  const { absences } = useAbsences()

  // Bazar
  const [bazarMonth, setBazarMonth] = useState(monthOf(now.date))
  const { entries } = useBazar(bazarMonth)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Cleaning
  const { cleaning } = useCleaning()
  const [cleanOpen, setCleanOpen] = useState(false)
  const [cleanId, setCleanId] = useState<string | null>(null)
  const [cleanEmail, setCleanEmail] = useState('')
  const [cleanRound, setCleanRound] = useState(1)
  const [cleanDate, setCleanDate] = useState(now.date)

  const nickOf = (em: string) => members.find((m) => m.email === em)?.nickname ?? nickFromId(em)
  const nameOf = (em: string) => members.find((m) => m.email === em)?.name ?? nickFromId(em)

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

  const rounds = useMemo(() => {
    const map = new Map<number, CleaningDoc[]>()
    for (const c of cleaning) {
      const list = map.get(c.round) ?? []
      list.push(c)
      map.set(c.round, list)
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0])
  }, [cleaning])

  function openCleanAdd() {
    setCleanId(null)
    setCleanEmail(activeMembers[0]?.email ?? '')
    setCleanRound(rounds.length > 0 ? rounds[rounds.length - 1][0] : 1)
    setCleanDate(now.date)
    setCleanOpen(true)
  }

  function openCleanEdit(c: CleaningDoc) {
    setCleanId(c.id ?? null)
    setCleanEmail(c.email)
    setCleanRound(c.round)
    setCleanDate(c.date || now.date)
    setCleanOpen(true)
  }

  async function saveCleaning() {
    const data = { email: cleanEmail, round: cleanRound, date: cleanDate, done: false, doneDate: '' }
    if (cleanId) {
      const prev = cleaning.find((c) => c.id === cleanId)
      await setDoc(doc(db, 'cleaning', cleanId), {
        ...data,
        done: prev?.done ?? false,
        doneDate: prev?.doneDate ?? '',
      })
    } else {
      await addDoc(collection(db, 'cleaning'), data)
    }
    setCleanOpen(false)
  }

  async function toggleDone(c: CleaningDoc) {
    if (!c.id) return
    await setDoc(
      doc(db, 'cleaning', c.id),
      c.done ? { done: false, doneDate: '' } : { done: true, doneDate: now.date },
      { merge: true },
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Admin Overview 🛡️</h1>
        <p className="text-sm text-ink/50 font-medium">Only admins can see this page.</p>
      </div>

      <SegmentTabs tabs={TABS} value={tab} onChange={setTab} layoutId="admin-tab" />

      {/* ---- Meal board ---- */}
      {tab === 'meals' && (
        <motion.div className="card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-extrabold">{dayLabel(date)}</h2>
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
                <span className={`chip ${r.lunch ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                  🍛 {r.lunch ? 'ON' : 'OFF'}
                  {r.guestsLunch > 0 && ` +${r.guestsLunch}`}
                </span>
                <span className={`chip ${r.dinner ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'}`}>
                  🍲 {r.dinner ? 'ON' : 'OFF'}
                  {r.guestsDinner > 0 && ` +${r.guestsDinner}`}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ---- Bazar ---- */}
      {tab === 'bazar' && (
        <motion.div className="card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-extrabold flex items-center gap-2">
              Spending by member
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
                    <ChevronDown size={16} className={`text-ink/35 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <motion.div
                      className="px-3 pb-3 space-y-2 bg-ink/2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      {list.length === 0 ? (
                        <p className="text-xs text-ink/40 font-semibold pt-2">No bazar this month.</p>
                      ) : (
                        list.map((e) => (
                          <div key={e.id} className="rounded-xl bg-white border border-ink/6 p-2.5">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-extrabold text-ink/55">{dayLabel(e.date)}</span>
                              <span className="text-sm font-extrabold text-brand-600">{fmtPaisa(e.totalPaisa)}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {e.items.map((it, i) => (
                                <span key={i} className="chip bg-ink/4 text-ink/70 !text-[11px]">
                                  {it.emoji} {it.name} · {it.qty} {it.unit} · {fmtPaisa(it.pricePaisa)}
                                </span>
                              ))}
                            </div>
                            {e.note && <div className="text-[11px] text-ink/45 font-medium mt-1.5">📝 {e.note}</div>}
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
      )}

      {/* ---- Cleaning roster ---- */}
      {tab === 'cleaning' && (
        <motion.div className="card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-extrabold flex items-center gap-2">
              <Sparkles size={18} className="text-mteal-500" /> Washroom & basin washing
            </h2>
            <motion.button whileTap={{ scale: 0.95 }} className="btn-teal px-4 py-2 text-sm" onClick={openCleanAdd}>
              <Plus size={14} /> Assign
            </motion.button>
          </div>

          {cleaning.length === 0 ? (
            <p className="text-sm text-ink/45 font-medium">No cleaning duty assigned yet.</p>
          ) : (
            <div className="space-y-5">
              {rounds.map(([round, list]) => (
                <div key={round}>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-ink/40 mb-2">
                    Round {round}
                  </div>
                  <div className="space-y-2">
                    {list.map((c) => {
                      const isToday = c.date === now.date && !c.done
                      const overdue = !c.done && c.date && c.date < now.date
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5
                            ${isToday ? 'bg-sun-300/25 border-sun-500/40 ring-2 ring-sun-500/15' : 'bg-ink/3 border-ink/8'}
                            ${c.done ? 'opacity-75' : ''}`}
                        >
                          <Avatar name={nameOf(c.email)} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{nickOf(c.email)}</div>
                            <div className="text-[11px] font-semibold text-ink/45">
                              {c.date ? dayLabel(c.date) : 'earlier round'}
                            </div>
                          </div>
                          {c.done ? (
                            <span className="chip bg-emerald-100 text-emerald-700">
                              <Check size={11} /> Done{c.doneDate ? ` · ${dayLabel(c.doneDate)}` : ''}
                            </span>
                          ) : isToday ? (
                            <span className="chip bg-sun-500 text-white">Today</span>
                          ) : overdue ? (
                            <span className="chip bg-rose-100 text-rose-600">Overdue</span>
                          ) : (
                            <span className="chip bg-ink/5 text-ink/50">Upcoming</span>
                          )}
                          <div className="flex gap-1 no-print">
                            <button
                              className={`btn-ghost p-2 rounded-xl ${c.done ? 'text-amber-600' : 'text-emerald-600'}`}
                              onClick={() => toggleDone(c)}
                              title={c.done ? 'Mark as not done' : 'Mark as done'}
                            >
                              {c.done ? <Undo2 size={14} /> : <Check size={14} />}
                            </button>
                            <button className="btn-ghost p-2 rounded-xl" onClick={() => openCleanEdit(c)} title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn-ghost p-2 rounded-xl text-rose-500"
                              onClick={() => c.id && deleteDoc(doc(db, 'cleaning', c.id))}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Cleaning assign/edit modal */}
      <Modal
        open={cleanOpen}
        onClose={() => setCleanOpen(false)}
        title={cleanId ? 'Edit cleaning duty' : 'Assign cleaning duty'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Member</label>
            <select className="input" value={cleanEmail} onChange={(e) => setCleanEmail(e.target.value)}>
              {activeMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.nickname}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Round</label>
              <input
                className="input"
                type="number"
                min={1}
                value={cleanRound}
                onChange={(e) => setCleanRound(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={cleanDate} onChange={(e) => setCleanDate(e.target.value)} />
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-primary w-full py-3" onClick={saveCleaning}>
            {cleanId ? 'Save changes' : 'Assign'}
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
