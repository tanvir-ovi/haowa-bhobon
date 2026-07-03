import { motion } from 'framer-motion'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import {
  UtensilsCrossed,
  ShoppingBasket,
  Wallet,
  TrendingUp,
  Minus,
  Plus,
  Sun,
  CalendarDays,
} from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useMeals, useBazar, useDuty, useTick } from '../hooks/useData'
import {
  dhakaNow,
  monthOf,
  addDays,
  canToggle,
  minutesToCutoff,
  fmtDuration,
  mealKey,
  countMeals,
  fmtTk,
  dayLabel,
  monthLabel,
} from '../lib/utils'
import { DINNER_CUTOFF_MIN } from '../lib/constants'
import MealSwitch from '../components/MealSwitch'
import StatCard from '../components/StatCard'
import Avatar from '../components/Avatar'
import type { MealDoc } from '../types'

export default function Dashboard() {
  const { member, user, members, activeMembers } = useAuth()
  useTick(1000)
  const now = dhakaNow()
  const today = now.date
  const tomorrow = addDays(today, 1)
  const month = monthOf(today)
  const { meals } = useMeals(month)
  const { meals: mealsNext } = useMeals(monthOf(tomorrow))
  const { entries: bazar } = useBazar(month)
  const { duty } = useDuty(month)
  const email = (member?.email ?? user?.email ?? '').toLowerCase()

  const mapFor = (date: string) => (monthOf(date) === month ? meals : mealsNext)

  function mealState(date: string) {
    const d = mapFor(date).get(mealKey(date, email))
    return { lunch: d?.lunch ?? true, dinner: d?.dinner ?? true, guests: d?.guests ?? 0 }
  }

  async function write(date: string, patch: Partial<Pick<MealDoc, 'lunch' | 'dinner' | 'guests'>>) {
    const cur = mealState(date)
    await setDoc(
      doc(db, 'meals', mealKey(date, email)),
      { date, month: monthOf(date), email, ...cur, ...patch, updatedAt: serverTimestamp() },
      { merge: true },
    )
  }

  // Stats
  const myMeals = countMeals(meals, email, month, today)
  const totalMeals = activeMembers.reduce((s, m) => s + countMeals(meals, m.email, month, today), 0)
  const totalBazar = bazar.reduce((s, e) => s + e.total, 0)
  const myBazar = bazar.filter((e) => e.email === email).reduce((s, e) => s + e.total, 0)
  const rate = totalMeals > 0 ? totalBazar / totalMeals : 0

  // Bazar duty
  const dutyToday = duty.find((d) => d.startDate <= today && today <= d.endDate)
  const dutyNext = duty.find((d) => d.startDate > today)
  const dutyMember = (em?: string) => members.find((m) => m.email === em)

  const hour = parseInt(now.hh, 10)
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  function DayCard({ title, date }: { title: string; date: string }) {
    const st = mealState(date)
    const isToday = date === today
    const lunchLocked = !canToggle(date, 'lunch', now)
    const dinnerLocked = !canToggle(date, 'dinner', now)
    const guestsLocked = isToday ? now.minutes >= DINNER_CUTOFF_MIN : date < today
    const hint = (meal: 'lunch' | 'dinner', locked: boolean) => {
      if (!isToday) return 'Free to change'
      if (locked) return meal === 'lunch' ? 'Locked at 9:30 AM' : 'Locked at 6:00 PM'
      return `Locks in ${fmtDuration(minutesToCutoff(meal, now))}`
    }
    return (
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
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
            onToggle={() => write(date, { lunch: !st.lunch })}
          />
          <MealSwitch
            label="Dinner"
            emoji="🍲"
            on={st.dinner}
            locked={dinnerLocked}
            hint={hint('dinner', dinnerLocked)}
            onToggle={() => write(date, { dinner: !st.dinner })}
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-ink/4 px-4 py-2.5">
          <span className="text-sm font-bold text-ink/60">🍽️ Guest meals</span>
          <div className="flex items-center gap-3">
            <button
              className="btn-ghost w-8 h-8 rounded-xl"
              disabled={guestsLocked || st.guests === 0}
              onClick={() => write(date, { guests: Math.max(0, st.guests - 1) })}
            >
              <Minus size={14} />
            </button>
            <span className="font-extrabold w-5 text-center tabular-nums">{st.guests}</span>
            <button
              className="btn-ghost w-8 h-8 rounded-xl"
              disabled={guestsLocked}
              onClick={() => write(date, { guests: st.guests + 1 })}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-extrabold">
          {greeting}, {member?.nickname ?? 'friend'} 👋
        </h1>
        <p className="text-sm text-ink/50 font-medium">
          {monthLabel(month)} · here is your mess at a glance
        </p>
      </div>

      {/* Bazar duty banner */}
      <motion.div
        className="card p-5 bg-gradient-to-r from-sun-300/40 via-white to-mteal-300/25 overflow-hidden relative"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sun-400 to-sun-600 text-white flex items-center justify-center shadow-lg shadow-sun-500/30">
            <Sun size={22} />
          </div>
          <div className="flex-1 min-w-48">
            <div className="text-xs font-bold uppercase tracking-wider text-ink/45">
              Bazar duty today
            </div>
            {dutyToday ? (
              <div className="flex items-center gap-2 mt-1">
                <Avatar name={dutyMember(dutyToday.email)?.name ?? dutyToday.email} size="sm" />
                <span className="font-extrabold">
                  {dutyMember(dutyToday.email)?.nickname ?? dutyToday.email}
                </span>
                <span className="chip bg-sun-300/50 text-amber-800">
                  {dayLabel(dutyToday.startDate)} → {dayLabel(dutyToday.endDate)}
                </span>
              </div>
            ) : (
              <div className="font-bold text-ink/50 mt-1">No one assigned — ask the manager</div>
            )}
          </div>
          {dutyNext && (
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                Up next
              </div>
              <div className="font-bold text-sm">
                {dutyMember(dutyNext.email)?.nickname ?? dutyNext.email} ·{' '}
                {dayLabel(dutyNext.startDate)}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Today / tomorrow toggles */}
      <div className="grid md:grid-cols-2 gap-4">
        <DayCard title="Today" date={today} />
        <DayCard title="Tomorrow" date={tomorrow} />
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<UtensilsCrossed size={20} />}
          label="My meals"
          value={String(myMeals)}
          sub={`mess total ${totalMeals}`}
          accent="brand"
          delay={0.05}
        />
        <StatCard
          icon={<Wallet size={20} />}
          label="My bazar"
          value={fmtTk(myBazar)}
          sub="spent from my pocket"
          accent="teal"
          delay={0.1}
        />
        <StatCard
          icon={<ShoppingBasket size={20} />}
          label="Total bazar"
          value={fmtTk(totalBazar)}
          sub={`${bazar.length} entries`}
          accent="sun"
          delay={0.15}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Live meal rate"
          value={fmtTk(rate)}
          sub="so far this month"
          accent="ink"
          delay={0.2}
        />
      </div>
    </div>
  )
}
