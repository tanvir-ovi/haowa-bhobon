import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import {
  Wifi,
  Droplets,
  Flame,
  Zap,
  Newspaper,
  ChefHat,
  PackagePlus,
  Plus,
  Pencil,
  Trash2,
  Receipt,
  Users,
} from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useBills } from '../hooks/useData'
import MonthPicker from '../components/MonthPicker'
import Modal from '../components/Modal'
import Avatar from '../components/Avatar'
import Skeleton from '../components/Skeleton'
import StatCard from '../components/StatCard'
import { dhakaNow, dayLabel, monthOf, nickFromId } from '../lib/utils'
import { fmtPaisa, toPaisa } from '../lib/money'
import { KHALA_DEFAULT_PAISA } from '../lib/constants'
import type { BillDoc, BillType } from '../types'

const BILL_TYPES: { key: BillType; label: string; icon: React.ReactNode; defaultPaisa: number }[] = [
  { key: 'wifi', label: 'Wi-Fi', icon: <Wifi size={16} />, defaultPaisa: 800 * 100 },
  { key: 'water', label: 'Water', icon: <Droplets size={16} />, defaultPaisa: 500 * 100 },
  { key: 'gas', label: 'Gas', icon: <Flame size={16} />, defaultPaisa: 1000 * 100 },
  { key: 'electricity', label: 'Electricity (recharge)', icon: <Zap size={16} />, defaultPaisa: 0 },
  { key: 'newspaper', label: 'Newspaper', icon: <Newspaper size={16} />, defaultPaisa: 0 },
  { key: 'dustbin', label: 'Dustbin', icon: <Trash2 size={16} />, defaultPaisa: 120 * 100 },
  { key: 'khala', label: 'Cook (Khala)', icon: <ChefHat size={16} />, defaultPaisa: KHALA_DEFAULT_PAISA },
  { key: 'other', label: 'Other', icon: <PackagePlus size={16} />, defaultPaisa: 0 },
]

const typeInfo = (t: BillType) => BILL_TYPES.find((b) => b.key === t) ?? BILL_TYPES[BILL_TYPES.length - 1]

export default function Expenses() {
  const { member, user, members, activeMembers, isManager } = useAuth()
  const now = dhakaNow()
  const [month, setMonth] = useState(monthOf(now.date))
  const { bills, loading } = useBills(month)
  const myEmail = (member?.email ?? user?.email ?? '').toLowerCase()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState<BillType>('wifi')
  const [amountTk, setAmountTk] = useState<number | ''>('')
  const [payer, setPayer] = useState(myEmail)
  const [date, setDate] = useState(now.date)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const nickOf = (em: string) => members.find((m) => m.email === em)?.nickname ?? nickFromId(em)
  const nameOf = (em: string) => members.find((m) => m.email === em)?.name ?? nickFromId(em)

  const count = activeMembers.length
  const billsPaisa = bills.filter((b) => b.type !== 'khala').reduce((s, b) => s + (b.amountPaisa || 0), 0)
  const khalaTotalPaisa = bills.filter((b) => b.type === 'khala').reduce((s, b) => s + (b.amountPaisa || 0), 0)
  const grandPaisa = billsPaisa + khalaTotalPaisa
  const perHeadPaisa = count > 0 ? grandPaisa / count : 0

  const totalsByMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of bills) map.set(b.email, (map.get(b.email) ?? 0) + (b.amountPaisa || 0))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [bills])

  const billsByDate = useMemo(() => {
    const map = new Map<string, BillDoc[]>()
    for (const b of bills) {
      const list = map.get(b.date) ?? []
      list.push(b)
      map.set(b.date, list)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [bills])

  function openAdd(preset?: { type: BillType; amountPaisa: number }) {
    setEditingId(null)
    setType(preset?.type ?? 'wifi')
    setAmountTk(preset?.amountPaisa ? preset.amountPaisa / 100 : '')
    setPayer(myEmail)
    setDate(now.date)
    setNote('')
    setModalOpen(true)
  }

  function openEdit(b: BillDoc) {
    setEditingId(b.id ?? null)
    setType(b.type)
    setAmountTk(b.amountPaisa ? b.amountPaisa / 100 : '')
    setPayer(b.email)
    setDate(b.date)
    setNote(b.note)
    setModalOpen(true)
  }

  async function save() {
    const amountPaisa = toPaisa(Number(amountTk) || 0)
    if (amountPaisa <= 0 || !payer || saving) return
    setSaving(true)
    const payload = { month: monthOf(date), type, date, email: payer, amountPaisa, note: note.trim() }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'bills', editingId), payload)
      } else {
        await addDoc(collection(db, 'bills'), { ...payload, createdAt: serverTimestamp() })
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function removeBill(b: BillDoc) {
    if (!b.id) return
    if (!window.confirm(`Delete this ${fmtPaisa(b.amountPaisa)} ${typeInfo(b.type).label} bill paid by ${nickOf(b.email)}?`))
      return
    await deleteDoc(doc(db, 'bills', b.id))
  }

  const canEdit = (b: BillDoc) => isManager || b.email === myEmail

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Bills 💡</h1>
          <p className="text-sm text-ink/50 font-medium">
            Paid a bill from your own pocket? Tag your name — the app remembers, even if your
            flatmates conveniently forget. 😄
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} onChange={setMonth} />
          <motion.button whileTap={{ scale: 0.95 }} className="btn-primary px-4 py-2.5" onClick={() => openAdd()}>
            <Plus size={16} /> Add bill
          </motion.button>
        </div>
      </div>

      {/* Quick add — recurring bills */}
      <div className="flex flex-wrap gap-2">
        {BILL_TYPES.filter((b) => b.defaultPaisa > 0).map((b) => (
          <motion.button
            key={b.key}
            whileTap={{ scale: 0.95 }}
            className="chip bg-ink/4 hover:bg-ink/8 transition text-ink/70"
            onClick={() => openAdd({ type: b.key, amountPaisa: b.defaultPaisa })}
          >
            {b.icon} {b.label} · {fmtPaisa(b.defaultPaisa)}
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Zap size={20} />} label="Bills total" value={fmtPaisa(billsPaisa)} sub="wifi + water + gas + more" accent="sun" />
        <StatCard icon={<ChefHat size={20} />} label="Cook total" value={fmtPaisa(khalaTotalPaisa)} sub={`split ${count} ways`} accent="teal" delay={0.05} />
        <StatCard icon={<PackagePlus size={20} />} label="Grand total" value={fmtPaisa(grandPaisa)} sub="all shared costs" accent="brand" delay={0.1} />
        <StatCard icon={<Users size={20} />} label="Per member" value={fmtPaisa(perHeadPaisa)} sub="added to each balance" accent="ink" delay={0.15} />
      </div>

      {/* Paid this month, by member */}
      <motion.div className="card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="font-extrabold mb-3 flex items-center gap-2">
          <Receipt size={18} className="text-brand-500" /> Paid this month
        </h2>
        {totalsByMember.length === 0 ? (
          <p className="text-sm text-ink/45 font-medium">
            Nobody's fronted a bill yet — the wifi router is not paying for itself. 👀
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {totalsByMember.map(([em, amt]) => (
              <div key={em} className="flex items-center gap-2 rounded-2xl bg-ink/3 px-3 py-1.5">
                <Avatar name={nameOf(em)} size="sm" />
                <span className="font-bold text-sm">{nickOf(em)}</span>
                <span className="chip bg-mteal-500/10 text-mteal-600">{fmtPaisa(amt)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div className="space-y-4">
          {billsByDate.map(([d, list]) => (
            <div key={d}>
              <div className="text-xs font-extrabold uppercase tracking-wider text-ink/40 mb-2 px-1">
                {dayLabel(d)}
              </div>
              <div className="space-y-2">
                {list.map((b) => {
                  const info = typeInfo(b.type)
                  return (
                    <motion.div
                      key={b.id}
                      className="card p-4 flex items-center gap-3"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="w-9 h-9 rounded-xl bg-ink/5 flex items-center justify-center text-ink/60 shrink-0">
                        {info.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{info.label}</div>
                        <div className="text-xs text-ink/45 font-semibold flex items-center gap-1.5">
                          <Avatar name={nameOf(b.email)} size="sm" />
                          {nickOf(b.email)}
                          {b.note && <span className="truncate">· 📝 {b.note}</span>}
                        </div>
                      </div>
                      <span className="font-extrabold text-brand-600">{fmtPaisa(b.amountPaisa)}</span>
                      {canEdit(b) && (
                        <div className="flex gap-1 no-print">
                          <button className="btn-ghost p-2 rounded-xl" onClick={() => openEdit(b)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn-ghost p-2 rounded-xl text-rose-500"
                            onClick={() => removeBill(b)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
          {bills.length === 0 && (
            <div className="card p-10 text-center text-ink/40 font-bold">
              No bills logged this month yet. Tap "Add bill" the moment you pay one.
            </div>
          )}
        </div>
      )}

      {/* Add/edit bill modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit bill' : 'Add bill'}>
        <div className="space-y-4">
          <div>
            <label className="label">Bill type</label>
            <select
              className="input"
              title="Bill type"
              value={type}
              onChange={(e) => setType(e.target.value as BillType)}
            >
              {BILL_TYPES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (Tk)</label>
              <input
                className="input"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={amountTk}
                onChange={(e) => setAmountTk(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                title="Paid date"
                value={date}
                max={now.date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">Paid by</label>
            {isManager ? (
              <select className="input" title="Who paid" value={payer} onChange={(e) => setPayer(e.target.value)}>
                {activeMembers.map((m) => (
                  <option key={m.email} value={m.email}>
                    {m.nickname}
                  </option>
                ))}
              </select>
            ) : (
              <div className="input bg-ink/4 font-bold">{nickOf(myEmail)}</div>
            )}
          </div>
          <div>
            <label className="label">Note {type === 'other' && '(what is it?)'}</label>
            <input
              className="input"
              placeholder={type === 'electricity' ? 'e.g. 3rd recharge this month' : 'optional'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="btn-primary w-full py-3"
            onClick={save}
            disabled={saving || !amountTk || Number(amountTk) <= 0}
          >
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save bill'}
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
