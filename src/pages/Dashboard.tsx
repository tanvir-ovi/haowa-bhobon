import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import {
  UtensilsCrossed,
  ShoppingBasket,
  Wallet,
  TrendingUp,
  Minus,
  Plus,
  Sun,
  Moon,
  CalendarDays,
  CalendarRange,
  ChefHat,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useMeals, useBazar, useDuty, useAbsences, useCleaning, useTick } from '../hooks/useData'
import {
  dhakaNow,
  monthOf,
  addDays,
  canToggle,
  minutesToCutoff,
  fmtDuration,
  mealKey,
  countMeals,
  resolveMeal,
  nickFromId,
  dayLabel,
  monthLabel,
  type DhakaNow,
  type ResolvedMeal,
} from '../lib/utils'
import { fmtPaisa } from '../lib/money'
import MealSwitch from '../components/MealSwitch'
import StatCard from '../components/StatCard'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import SegmentTabs from '../components/SegmentTabs'
import type { MealDoc } from '../types'

type MealPatch = Partial<Pick<MealDoc, 'lunch' | 'dinner' | 'guestsLunch' | 'guestsDinner'>>
type Tab = 'today' | 'duties' | 'away' | 'stats'

const TABS = [
  { id: 'today' as Tab, label: 'Today', icon: Sun },
  { id: 'duties' as Tab, label: 'Duties', icon: CalendarRange },
  { id: 'away' as Tab, label: 'Away', icon: Moon },
  { id: 'stats' as Tab, label: 'Stats', icon: TrendingUp },
]

// Top-level component (not nested in Dashboard) so re-renders from the
// countdown tick never remount it — nesting it caused visible flicker.
function DayCard({
  title,
  date,
  now,
  st,
  onPatch,
}: {
  title: string
  date: string
  now: DhakaNow
  st: ResolvedMeal
  onPatch: (patch: MealPatch) => void
}) {
  const isToday = date === now.date
  const lunchLocked = !canToggle(date, 'lunch', now)
  const dinnerLocked = !canToggle(date, 'dinner', now)
  const hint = (meal: 'lunch' | 'dinner', locked: boolean) => {
    if (!isToday) return 'Free to change'
    if (locked) return meal === 'lunch' ? 'Locked at 9:30 AM' : 'Locked at 6:00 PM'
    return `Locks in ${fmtDuration(minutesToCutoff(meal, now))}`
  }

  function GuestRow({
    label,
    value,
    locked,
    onChange,
  }: {
    label: string
    value: number
    locked: boolean
    onChange: (v: number) => void
  }) {
    return (
      <div className="flex items-center justify-between rounded-2xl bg-ink/4 px-3 py-2">
        <span className="text-xs font-bold text-ink/60">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-ghost w-7 h-7 rounded-xl"
            disabled={locked || value === 0}
            onClick={() => onChange(Math.max(0, value - 1))}
            title={`Remove ${label} guest`}
            aria-label={`Remove ${label} guest`}
          >
            <Minus size={13} />
          </button>
          <span className="font-extrabold w-4 text-center tabular-nums text-sm">{value}</span>
          <button
            type="button"
            className="btn-ghost w-7 h-7 rounded-xl"
            disabled={locked}
            onClick={() => onChange(value + 1)}
            title={`Add ${label} guest`}
            aria-label={`Add ${label} guest`}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-ink/40">{title}</div>
          <div className="font-extrabold">{dayLabel(date)}</div>
        </div>
        <CalendarDays size={18} className="text-ink/30" />
      </div>
      <div className="flex gap-3">
        <MealSwitch
          label="Lunch"
          emoji="🍛"
          on={st.lunch}
          locked={lunchLocked}
          hint={hint('lunch', lunchLocked)}
          onToggle={() => onPatch({ lunch: !st.lunch })}
        />
        <MealSwitch
          label="Dinner"
          emoji="🍲"
          on={st.dinner}
          locked={dinnerLocked}
          hint={hint('dinner', dinnerLocked)}
          onToggle={() => onPatch({ dinner: !st.dinner })}
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <GuestRow
          label="🍽️ Lunch guests"
          value={st.guestsLunch}
          locked={lunchLocked}
          onChange={(v) => onPatch({ guestsLunch: v })}
        />
        <GuestRow
          label="🍽️ Dinner guests"
          value={st.guestsDinner}
          locked={dinnerLocked}
          onChange={(v) => onPatch({ guestsDinner: v })}
        />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { member, user, members, activeMembers, isManager } = useAuth()
  useTick(30000)
  const now = dhakaNow()
  const today = now.date
  const tomorrow = addDays(today, 1)
  const month = monthOf(today)
  const { meals } = useMeals(month)
  const { meals: mealsNext } = useMeals(monthOf(tomorrow))
  const { entries: bazar } = useBazar(month)
  const { duty } = useDuty(month)
  const { absences } = useAbsences()
  const { cleaning } = useCleaning()
  const email = (member?.email ?? user?.email ?? '').toLowerCase()
  const [tab, setTab] = useState<Tab>('today')

  // Away modal state
  const [awayOpen, setAwayOpen] = useState(false)
  const [awayMember, setAwayMember] = useState(email)
  const [awayLunch, setAwayLunch] = useState(true)
  const [awayDinner, setAwayDinner] = useState(true)
  const [awayStart, setAwayStart] = useState(tomorrow)
  const [awayEnd, setAwayEnd] = useState('')
  const [awaySaving, setAwaySaving] = useState(false)

  const mapFor = (date: string) => (monthOf(date) === month ? meals : mealsNext)
  const stateFor = (date: string) => resolveMeal(mapFor(date), absences, email, date)
  const nickOf = (em: string) => members.find((m) => m.email === em)?.nickname ?? nickFromId(em)
  const nameOf = (em: string) => members.find((m) => m.email === em)?.name ?? nickFromId(em)

  function patchMeal(date: string, patch: MealPatch) {
    const cur = stateFor(date)
    void setDoc(
      doc(db, 'meals', mealKey(date, email)),
      {
        date,
        month: monthOf(date),
        email,
        lunch: cur.lunch,
        dinner: cur.dinner,
        guestsLunch: cur.guestsLunch,
        guestsDinner: cur.guestsDinner,
        ...patch,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  // Plates the cook needs per meal (members ON + their guests).
  function cookCounts(date: string) {
    let lunch = 0
    let dinner = 0
    for (const m of activeMembers) {
      const r = resolveMeal(mapFor(date), absences, m.email, date)
      lunch += (r.lunch ? 1 : 0) + r.guestsLunch
      dinner += (r.dinner ? 1 : 0) + r.guestsDinner
    }
    return { lunch, dinner }
  }
  const cookToday = cookCounts(today)
  const cookTomorrow = cookCounts(tomorrow)

  // Stats
  const myMeals = countMeals(meals, absences, email, month, today)
  const totalMeals = activeMembers.reduce(
    (s, m) => s + countMeals(meals, absences, m.email, month, today),
    0,
  )
  const totalBazarPaisa = bazar.reduce((s, e) => s + (e.totalPaisa || 0), 0)
  const myBazarPaisa = bazar
    .filter((e) => e.email === email)
    .reduce((s, e) => s + (e.totalPaisa || 0), 0)
  const ratePaisa = totalMeals > 0 ? totalBazarPaisa / totalMeals : 0

  // Duties
  const dutyToday = duty.find((d) => d.startDate <= today && today <= d.endDate)
  const dutyNext = duty.find((d) => d.startDate > today)
  const activeAbsences = absences.filter((a) => !a.endDate || a.endDate >= today)
  const nextCleaning = cleaning
    .filter((c) => !c.done && c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  async function saveAway() {
    if (!awayLunch && !awayDinner) return
    if (awayEnd && awayEnd < awayStart) return
    setAwaySaving(true)
    try {
      const target = isManager ? awayMember : email
      await addDoc(collection(db, 'absences'), {
        email: target,
        lunch: awayLunch,
        dinner: awayDinner,
        startDate: awayStart,
        endDate: awayEnd,
        createdAt: serverTimestamp(),
      })
      const snap = await getDocs(query(collection(db, 'meals'), where('email', '==', target)))
      const batch = writeBatch(db)
      const effectiveFrom = isManager ? awayStart : awayStart > tomorrow ? awayStart : tomorrow
      snap.forEach((d) => {
        const dd = d.data() as MealDoc
        if (dd.date >= effectiveFrom && (!awayEnd || dd.date <= awayEnd)) batch.delete(d.ref)
      })
      await batch.commit()
      setAwayOpen(false)
    } finally {
      setAwaySaving(false)
    }
  }

  const hour = parseInt(now.hh, 10)
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold">
          {greeting}, {member?.nickname ?? 'friend'} 👋
        </h1>
        <p className="text-sm text-ink/50 font-medium">
          {monthLabel(month)} · here is your mess at a glance (yes, we can see who skipped bazar)
        </p>
      </div>

      <SegmentTabs tabs={TABS} value={tab} onChange={setTab} layoutId="dash-tab" />

      {/* ---- TODAY ---- */}
      {tab === 'today' && (
        <motion.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Cook counts */}
          <div className="card p-5 bg-gradient-to-r from-brand-50 via-white to-sun-300/25">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                <ChefHat size={22} />
              </div>
              <div>
                <div className="font-extrabold">Plates to cook</div>
                <div className="text-xs font-semibold text-ink/45">members ON + guests</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Today', c: cookToday },
                { label: 'Tomorrow', c: cookTomorrow },
              ].map(({ label, c }) => (
                <div key={label} className="rounded-2xl bg-white/80 border border-ink/6 p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40 mb-1.5">
                    {label}
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-2xl font-extrabold text-brand-600 tabular-nums">{c.lunch}</span>
                      <span className="text-xs font-bold text-ink/50 ml-1">🍛 lunch</span>
                    </div>
                    <div>
                      <span className="text-2xl font-extrabold text-mteal-600 tabular-nums">{c.dinner}</span>
                      <span className="text-xs font-bold text-ink/50 ml-1">🍲 dinner</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Duty strip */}
          <div className="card p-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Sun size={16} className="text-sun-500 shrink-0" />
              <span className="text-xs font-bold text-ink/60">
                Bazar duty:{' '}
                {dutyToday ? (
                  <span className="text-ink">{nickOf(dutyToday.email)}</span>
                ) : (
                  <span className="text-ink/40">nobody — the fridge is on its own today 😬</span>
                )}
                {dutyNext && (
                  <span className="text-ink/45">
                    {' '}
                    · next up {nickOf(dutyNext.email)} ({dayLabel(dutyNext.startDate)}) — start
                    mentally preparing
                  </span>
                )}
              </span>
            </div>
            {nextCleaning && (
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles size={15} className="text-mteal-500 shrink-0" />
                <span className="text-xs font-bold text-ink/60">
                  Washroom: <span className="text-ink">{nickOf(nextCleaning.email)}</span> ·{' '}
                  {nextCleaning.date === today ? (
                    <span className="text-brand-600">today</span>
                  ) : (
                    dayLabel(nextCleaning.date)
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Today / tomorrow toggles */}
          <div className="grid md:grid-cols-2 gap-4">
            <DayCard title="Today" date={today} now={now} st={stateFor(today)} onPatch={(p) => patchMeal(today, p)} />
            <DayCard
              title="Tomorrow"
              date={tomorrow}
              now={now}
              st={stateFor(tomorrow)}
              onPatch={(p) => patchMeal(tomorrow, p)}
            />
          </div>
        </motion.div>
      )}

      {/* ---- DUTIES ---- */}
      {tab === 'duties' && (
        <motion.div className="space-y-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Bazar duty roster */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBasket size={18} className="text-sun-500" />
              <h2 className="font-extrabold">Bazar duty — {monthLabel(month)}</h2>
            </div>
            {duty.length === 0 ? (
              <p className="text-sm text-ink/45 font-medium">
                No duty assigned this month yet — the fridge is watching, waiting. 🥶
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {duty.map((d) => {
                  const current = d.startDate <= today && today <= d.endDate
                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-2 rounded-2xl px-3 py-2 border
                        ${current ? 'bg-sun-300/30 border-sun-500/40 ring-2 ring-sun-500/20' : 'bg-ink/3 border-ink/8'}`}
                    >
                      <Avatar name={nameOf(d.email)} size="sm" />
                      <div>
                        <div className="font-bold text-sm leading-tight">
                          {nickOf(d.email)}
                          {current && <span className="chip bg-sun-500 text-white ml-2 !py-0.5">now</span>}
                        </div>
                        <div className="text-[11px] font-semibold text-ink/45">
                          {dayLabel(d.startDate)} → {dayLabel(d.endDate)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-[11px] text-ink/40 font-semibold mt-3">
              Manager assigns and edits duty in the Bazar tab.
            </p>
          </div>

          {/* Cleaning roster */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={18} className="text-mteal-500" />
              <h2 className="font-extrabold">Washroom & basin washing</h2>
            </div>
            {cleaning.length === 0 ? (
              <p className="text-sm text-ink/45 font-medium">
                No cleaning duty assigned yet — the washroom is judging everyone equally. 🧽
              </p>
            ) : (
              <div className="space-y-4">
                {[...new Set(cleaning.map((c) => c.round))]
                  .sort((a, b) => a - b)
                  .map((round) => (
                    <div key={round}>
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40 mb-1.5">
                        Round {round}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {cleaning
                          .filter((c) => c.round === round)
                          .map((c) => {
                            const isToday = c.date === today && !c.done
                            const overdue = !c.done && c.date && c.date < today
                            return (
                              <div
                                key={c.id}
                                className={`flex items-center gap-2 rounded-2xl border px-3 py-1.5
                                  ${isToday ? 'bg-sun-300/30 border-sun-500/40 ring-2 ring-sun-500/15' : 'bg-ink/3 border-ink/8'}
                                  ${c.done ? 'opacity-65' : ''}`}
                              >
                                <Avatar name={nameOf(c.email)} size="sm" />
                                <div>
                                  <div className="font-bold text-xs leading-tight">{nickOf(c.email)}</div>
                                  <div className="text-[10px] font-semibold text-ink/45">
                                    {c.date ? dayLabel(c.date) : 'earlier'}
                                  </div>
                                </div>
                                {c.done ? (
                                  <span className="chip bg-emerald-100 text-emerald-700 !py-0.5">✓ Done</span>
                                ) : isToday ? (
                                  <span className="chip bg-sun-500 text-white !py-0.5">Today</span>
                                ) : overdue ? (
                                  <span className="chip bg-rose-100 text-rose-600 !py-0.5">Overdue</span>
                                ) : null}
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ---- AWAY ---- */}
      {tab === 'away' && (
        <motion.div className="card p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Moon size={18} className="text-mteal-500" />
              <h2 className="font-extrabold">Away mode</h2>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn-teal px-4 py-2 text-sm"
              onClick={() => {
                setAwayMember(email)
                setAwayLunch(true)
                setAwayDinner(true)
                setAwayStart(tomorrow)
                setAwayEnd('')
                setAwayOpen(true)
              }}
            >
              <Moon size={14} /> Go away
            </motion.button>
          </div>
          <p className="text-xs font-semibold text-ink/45 mb-3">
            Turn meals off for a long period with one tap — no daily toggling. Cancel any time and
            meals turn back ON automatically.
          </p>
          {activeAbsences.length === 0 ? (
            <p className="text-sm text-ink/45 font-medium">
              Nobody is away. Everyone's meals turn ON automatically every day — resistance is
              futile, breakfast is inevitable.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {activeAbsences.map((a) => {
                const canCancel = isManager || a.email === email
                return (
                  <div key={a.id} className="flex items-center gap-2 rounded-2xl bg-ink/3 border border-ink/8 px-3 py-2">
                    <Avatar name={nameOf(a.email)} size="sm" />
                    <div>
                      <div className="font-bold text-sm leading-tight">
                        {nickOf(a.email)}
                        <span className="chip bg-rose-100 text-rose-600 ml-2 !py-0.5">
                          {a.lunch && a.dinner ? 'both off' : a.lunch ? 'lunch off' : 'dinner off'}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-ink/45">
                        {dayLabel(a.startDate)} → {a.endDate ? dayLabel(a.endDate) : 'until back'}
                      </div>
                    </div>
                    {canCancel && (
                      <button
                        type="button"
                        className="btn-ghost p-1.5 rounded-lg text-rose-500"
                        onClick={() => a.id && deleteDoc(doc(db, 'absences', a.id))}
                        title="Cancel leave (meals auto ON again)"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* ---- STATS ---- */}
      {tab === 'stats' && (
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <StatCard icon={<UtensilsCrossed size={20} />} label="My meals" value={String(myMeals)} sub={`mess total ${totalMeals}`} accent="brand" delay={0.05} />
          <StatCard icon={<Wallet size={20} />} label="My bazar" value={fmtPaisa(myBazarPaisa)} sub="spent from my pocket" accent="teal" delay={0.1} />
          <StatCard icon={<ShoppingBasket size={20} />} label="Total bazar" value={fmtPaisa(totalBazarPaisa)} sub={`${bazar.length} entries`} accent="sun" delay={0.15} />
          <StatCard icon={<TrendingUp size={20} />} label="Live meal rate" value={fmtPaisa(ratePaisa)} sub="so far this month" accent="ink" delay={0.2} />
        </motion.div>
      )}

      {/* Away modal */}
      <Modal open={awayOpen} onClose={() => setAwayOpen(false)} title="Away mode — long meal off">
        <div className="space-y-4">
          {isManager && (
            <div>
              <label className="label">Member</label>
              <select
                className="input"
                title="Member going away"
                value={awayMember}
                onChange={(e) => setAwayMember(e.target.value)}
              >
                {activeMembers.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.nickname}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Which meals stay OFF?</label>
            <div className="flex gap-3">
              {[
                { label: '🍛 Lunch', val: awayLunch, set: setAwayLunch },
                { label: '🍲 Dinner', val: awayDinner, set: setAwayDinner },
              ].map(({ label, val, set }) => (
                <label
                  key={label}
                  className={`flex-1 flex items-center gap-2 rounded-2xl border-2 px-4 py-3 cursor-pointer font-bold text-sm transition
                    ${val ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-ink/10 text-ink/50'}`}
                >
                  <input type="checkbox" className="accent-rose-500 w-4 h-4" checked={val} onChange={(e) => set(e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">From</label>
              <input
                className="input"
                type="date"
                title="Away from date"
                value={awayStart}
                min={isManager ? undefined : tomorrow}
                onChange={(e) => setAwayStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Until (empty = until back)</label>
              <input
                className="input"
                type="date"
                title="Away until date"
                value={awayEnd}
                min={awayStart}
                onChange={(e) => setAwayEnd(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-ink/45 font-medium">
            Meals stay OFF for the whole period. You can still turn a single day back ON from the
            calendar, or cancel the leave any time — then everything is auto ON again.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="btn-primary w-full py-3"
            onClick={saveAway}
            disabled={awaySaving || (!awayLunch && !awayDinner)}
          >
            {awaySaving ? 'Saving…' : 'Start away mode'}
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
