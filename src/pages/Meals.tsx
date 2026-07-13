import { useState } from 'react'
import { motion } from 'framer-motion'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ShieldCheck } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAbsences, useMeals, useTick } from '../hooks/useData'
import MonthPicker from '../components/MonthPicker'
import Avatar from '../components/Avatar'
import {
  dhakaNow,
  monthOf,
  datesOfMonth,
  weekdayOfFirst,
  canToggle,
  mealKey,
  countMeals,
  resolveMeal,
  dayLabel,
} from '../lib/utils'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function Meals() {
  const { member, user, members, activeMembers, isManager } = useAuth()
  useTick(30000)
  const now = dhakaNow()
  const [month, setMonth] = useState(monthOf(now.date))
  const { meals } = useMeals(month)
  const { absences } = useAbsences()
  const myEmail = (member?.email ?? user?.email ?? '').toLowerCase()
  const [selected, setSelected] = useState(myEmail)
  const [override, setOverride] = useState(false)

  const email = isManager ? selected : myEmail

  const state = (date: string) => resolveMeal(meals, absences, email, date)

  function editable(date: string, meal: 'lunch' | 'dinner') {
    if (isManager && override) return true
    if (email !== myEmail) return false
    return canToggle(date, meal, now)
  }

  async function toggle(date: string, meal: 'lunch' | 'dinner') {
    if (!editable(date, meal)) return
    const cur = state(date)
    await setDoc(
      doc(db, 'meals', mealKey(date, email)),
      {
        date,
        month: monthOf(date),
        email,
        lunch: cur.lunch,
        dinner: cur.dinner,
        guestsLunch: cur.guestsLunch,
        guestsDinner: cur.guestsDinner,
        [meal]: !cur[meal],
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  const dates = datesOfMonth(month)
  const blanks = weekdayOfFirst(month)
  const upto = month === monthOf(now.date) ? now.date : `${month}-31`

  function MealPill({
    date,
    meal,
    size = 'lg',
  }: {
    date: string
    meal: 'lunch' | 'dinner'
    size?: 'sm' | 'lg'
  }) {
    const st = state(date)
    const on = st[meal]
    const can = editable(date, meal)
    const cls =
      size === 'lg'
        ? 'px-3.5 py-1.5 rounded-xl text-xs'
        : 'w-5 h-5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg text-[9px] sm:text-[11px]'
    return (
      <button
        onClick={() => toggle(date, meal)}
        disabled={!can}
        title={`${meal} ${on ? 'ON' : 'OFF'}${can ? '' : ' (locked)'}`}
        className={`${cls} font-extrabold transition
          ${on ? 'bg-emerald-500 text-white' : 'bg-rose-200 text-rose-700'}
          ${can ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
      >
        {size === 'lg' ? (meal === 'lunch' ? '🍛 L' : '🍲 D') : meal === 'lunch' ? 'L' : 'D'}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Meal Calendar 🍽️</h1>
          <p className="text-sm text-ink/50 font-medium">
            Tap L / D to turn meals on or off. Lunch locks 9:30 AM, dinner 6:00 PM — after that,
            the kitchen doesn't take appeals. ⚖️
          </p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {isManager && (
        <div className="card p-4 flex flex-wrap items-center gap-4 no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-mteal-500" />
            <span className="text-sm font-bold text-ink/60">Editing for</span>
            <select className="input !w-auto py-1.5" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {members.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.nickname} {m.email === myEmail ? '(me)' : ''}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-ink/60 cursor-pointer">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="accent-brand-600 w-4 h-4"
            />
            Manager override (edit locked days)
          </label>
        </div>
      )}

      {/* Mobile: clean day list */}
      <motion.div
        className="sm:hidden space-y-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {dates.map((date) => {
          const st = state(date)
          const guests = st.guestsLunch + st.guestsDinner + st.legacyGuests
          const isToday = date === now.date
          const past = date < now.date
          return (
            <div
              key={date}
              className={`card !rounded-2xl px-4 py-2.5 flex items-center gap-3
                ${isToday ? 'ring-2 ring-brand-500/30 border-brand-400' : ''} ${past ? 'opacity-65' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-extrabold text-sm ${isToday ? 'text-brand-600' : ''}`}>
                  {dayLabel(date)}
                  {isToday && <span className="chip bg-brand-500 text-white ml-2 !py-0.5">today</span>}
                </div>
                {guests > 0 && (
                  <div className="text-[10px] font-bold text-amber-700">+{guests} guest{guests > 1 ? 's' : ''}</div>
                )}
              </div>
              <MealPill date={date} meal="lunch" />
              <MealPill date={date} meal="dinner" />
            </div>
          )
        })}
      </motion.div>

      {/* Desktop: month grid */}
      <motion.div
        className="hidden sm:block card p-4 sm:p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
          {WEEKDAYS.map((d, i) => (
            <div
              key={i}
              className="text-center text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-ink/40 py-1"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: blanks }).map((_, i) => (
            <div key={`b${i}`} />
          ))}
          {dates.map((date) => {
            const st = state(date)
            const guests = st.guestsLunch + st.guestsDinner + st.legacyGuests
            const isToday = date === now.date
            const past = date < now.date
            return (
              <div
                key={date}
                className={`rounded-xl sm:rounded-2xl border p-1 sm:p-2 flex flex-col items-center gap-1
                  ${isToday ? 'border-brand-400 bg-brand-50/60 ring-2 ring-brand-500/15' : 'border-ink/8 bg-white'}
                  ${past ? 'opacity-75' : ''}`}
              >
                <div className={`text-[10px] sm:text-xs font-extrabold ${isToday ? 'text-brand-600' : 'text-ink/50'}`}>
                  {parseInt(date.slice(8), 10)}
                </div>
                <div className="flex gap-1">
                  <MealPill date={date} meal="lunch" size="sm" />
                  <MealPill date={date} meal="dinner" size="sm" />
                </div>
                {guests > 0 && (
                  <div className="chip bg-sun-300/60 text-amber-800 !px-1.5 !py-0 text-[9px]">+{guests}</div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-4 text-xs font-bold text-ink/50">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Meal ON
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-200 inline-block" /> Meal OFF
          </span>
          <span className="flex items-center gap-1.5">
            <span className="chip bg-sun-300/60 text-amber-800 !px-1.5 !py-0 text-[9px]">+n</span>
            Guest meals
          </span>
        </div>
      </motion.div>

      {/* Member summary */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <h2 className="font-extrabold mb-4">Members — meals this month</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeMembers.map((m) => {
            const c = countMeals(meals, absences, m.email, month, upto)
            return (
              <div key={m.email} className="flex items-center gap-3 rounded-2xl bg-ink/3 px-3 py-2.5">
                <Avatar name={m.name} size="sm" />
                <span className="font-bold text-sm flex-1 truncate">{m.nickname}</span>
                <span className="chip bg-brand-50 text-brand-700">{c} meals</span>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
