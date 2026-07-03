import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { doc, setDoc } from 'firebase/firestore'
import {
  Wifi,
  Droplets,
  Flame,
  Zap,
  Newspaper,
  ChefHat,
  PackagePlus,
  Save,
  Users,
} from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useExpenses } from '../hooks/useData'
import MonthPicker from '../components/MonthPicker'
import Skeleton from '../components/Skeleton'
import StatCard from '../components/StatCard'
import { dhakaNow, fmtTk, monthOf } from '../lib/utils'
import type { ExpenseDoc } from '../types'

const FIELDS: { key: keyof ExpenseDoc; label: string; icon: React.ReactNode }[] = [
  { key: 'wifi', label: 'Wi-Fi', icon: <Wifi size={16} /> },
  { key: 'water', label: 'Water', icon: <Droplets size={16} /> },
  { key: 'gas', label: 'Gas', icon: <Flame size={16} /> },
  { key: 'electricity', label: 'Electricity', icon: <Zap size={16} /> },
  { key: 'newspaper', label: 'Newspaper', icon: <Newspaper size={16} /> },
  { key: 'other', label: 'Other', icon: <PackagePlus size={16} /> },
]

export default function Expenses() {
  const { activeMembers, isManager } = useAuth()
  const now = dhakaNow()
  const [month, setMonth] = useState(monthOf(now.date))
  const { expenses, loading } = useExpenses(month)
  const [form, setForm] = useState<ExpenseDoc>(expenses)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => setForm(expenses), [expenses])

  const num = (v: number) => (Number.isFinite(v) ? v : 0)
  const count = activeMembers.length
  const billsTotal =
    num(form.wifi) + num(form.water) + num(form.gas) + num(form.electricity) + num(form.newspaper) + num(form.other)
  const khalaTotal = num(form.khalaPerPerson) * count
  const grand = billsTotal + khalaTotal
  const perHead = count > 0 ? billsTotal / count + num(form.khalaPerPerson) : 0

  function patch(key: keyof ExpenseDoc, value: number | string) {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    try {
      await setDoc(doc(db, 'expenses', month), { ...form, month })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Utility Bills 💡</h1>
          <p className="text-sm text-ink/50 font-medium">
            Shared costs split equally between {count} active members.
          </p>
        </div>
        <MonthPicker month={month} onChange={setMonth} />
      </div>

      {loading ? (
        <Skeleton className="h-72" />
      ) : (
        <motion.div className="card p-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FIELDS.map(({ key, label, icon }) => (
              <div key={key}>
                <label className="label flex items-center gap-1.5">
                  {icon} {label} (Tk)
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="any"
                  value={(form[key] as number) || ''}
                  placeholder="0"
                  disabled={!isManager}
                  onChange={(e) => patch(key, Number(e.target.value))}
                />
              </div>
            ))}
            <div>
              <label className="label flex items-center gap-1.5">
                <ChefHat size={16} /> Cook bill / person (Tk)
              </label>
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                value={form.khalaPerPerson || ''}
                placeholder="500"
                disabled={!isManager}
                onChange={(e) => patch('khalaPerPerson', Number(e.target.value))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Other — what is it?</label>
              <input
                className="input"
                placeholder="e.g. gas stove repair"
                value={form.otherNote}
                disabled={!isManager}
                onChange={(e) => patch('otherNote', e.target.value)}
              />
            </div>
          </div>

          {isManager ? (
            <div className="flex items-center gap-3 mt-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className="btn-primary px-6 py-3"
                onClick={save}
                disabled={saving}
              >
                <Save size={16} /> {saving ? 'Saving…' : 'Save bills'}
              </motion.button>
              {saved && <span className="text-sm font-bold text-emerald-600">Saved ✓</span>}
            </div>
          ) : (
            <p className="text-xs text-ink/40 font-semibold mt-6">
              Only the manager or admin can edit bills.
            </p>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Zap size={20} />} label="Bills total" value={fmtTk(billsTotal)} sub="wifi + water + gas + more" accent="sun" />
        <StatCard icon={<ChefHat size={20} />} label="Cook total" value={fmtTk(khalaTotal)} sub={`${fmtTk(num(form.khalaPerPerson))} × ${count}`} accent="teal" delay={0.05} />
        <StatCard icon={<PackagePlus size={20} />} label="Grand total" value={fmtTk(grand)} sub="all shared costs" accent="brand" delay={0.1} />
        <StatCard icon={<Users size={20} />} label="Per member" value={fmtTk(perHead)} sub="added to each balance" accent="ink" delay={0.15} />
      </div>
    </div>
  )
}
