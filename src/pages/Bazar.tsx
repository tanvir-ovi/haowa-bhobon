import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { CalendarRange, Pencil, Plus, Search, ShoppingBasket, Trash2 } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useBazar, useDuty } from '../hooks/useData'
import MonthPicker from '../components/MonthPicker'
import Modal from '../components/Modal'
import Avatar from '../components/Avatar'
import Skeleton from '../components/Skeleton'
import { DUTY_DAYS, MENU_ITEMS, UNITS } from '../lib/constants'
import { addDays, dayLabel, dhakaNow, fmtTk, monthOf } from '../lib/utils'
import type { BazarEntry, BazarItem } from '../types'

interface ItemRow extends BazarItem {
  key: number
}

export default function Bazar() {
  const { member, user, members, activeMembers, isManager } = useAuth()
  const now = dhakaNow()
  const [month, setMonth] = useState(monthOf(now.date))
  const { entries, loading } = useBazar(month)
  const { duty } = useDuty(month)
  const myEmail = (member?.email ?? user?.email ?? '').toLowerCase()

  // ---- entry modal state ----
  const [entryOpen, setEntryOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [date, setDate] = useState(now.date)
  const [payer, setPayer] = useState(myEmail)
  const [note, setNote] = useState('')
  const [items, setItems] = useState<ItemRow[]>([])
  const [search, setSearch] = useState('')
  const [customName, setCustomName] = useState('')
  const [saving, setSaving] = useState(false)
  let keySeq = useMemo(() => ({ n: 0 }), [entryOpen])

  // ---- duty modal state ----
  const [dutyOpen, setDutyOpen] = useState(false)
  const [dutyEmail, setDutyEmail] = useState('')
  const [dutyStart, setDutyStart] = useState(now.date)

  const total = items.reduce((s, i) => s + (Number(i.price) || 0), 0)

  const nickOf = (em: string) => members.find((m) => m.email === em)?.nickname ?? em
  const nameOf = (em: string) => members.find((m) => m.email === em)?.name ?? em

  const totalsByMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) map.set(e.email, (map.get(e.email) ?? 0) + e.total)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  const grandTotal = entries.reduce((s, e) => s + e.total, 0)

  const entriesByDate = useMemo(() => {
    const map = new Map<string, BazarEntry[]>()
    for (const e of entries) {
      const list = map.get(e.date) ?? []
      list.push(e)
      map.set(e.date, list)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  const filteredMenu = MENU_ITEMS.filter((m) =>
    m.name.toLowerCase().includes(search.trim().toLowerCase()),
  )

  function openAdd() {
    setEditingId(null)
    setDate(now.date)
    setPayer(myEmail)
    setNote('')
    setItems([])
    setSearch('')
    setCustomName('')
    setEntryOpen(true)
  }

  function openEdit(e: BazarEntry) {
    setEditingId(e.id ?? null)
    setDate(e.date)
    setPayer(e.email)
    setNote(e.note)
    setItems(e.items.map((it, i) => ({ ...it, key: i })))
    keySeq.n = e.items.length
    setSearch('')
    setCustomName('')
    setEntryOpen(true)
  }

  function addItem(name: string, emoji: string, unit: string) {
    setItems((list) => [...list, { key: keySeq.n++, name, emoji, qty: 1, unit, price: 0 }])
  }

  function patchItem(key: number, patch: Partial<BazarItem>) {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  }

  async function saveEntry() {
    if (items.length === 0 || saving) return
    setSaving(true)
    const clean: BazarItem[] = items.map(({ key: _k, ...it }) => ({
      ...it,
      qty: Number(it.qty) || 0,
      price: Number(it.price) || 0,
    }))
    const payload = {
      date,
      month: monthOf(date),
      email: payer,
      items: clean,
      total: clean.reduce((s, i) => s + i.price, 0),
      note: note.trim(),
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'bazar', editingId), payload)
      } else {
        await addDoc(collection(db, 'bazar'), { ...payload, createdAt: serverTimestamp() })
      }
      setEntryOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function removeEntry(e: BazarEntry) {
    if (!e.id) return
    if (!window.confirm(`Delete this ${fmtTk(e.total)} bazar entry by ${nickOf(e.email)}?`)) return
    await deleteDoc(doc(db, 'bazar', e.id))
  }

  async function saveDuty() {
    if (!dutyEmail) return
    await addDoc(collection(db, 'duty'), {
      month: monthOf(dutyStart),
      email: dutyEmail,
      startDate: dutyStart,
      endDate: addDays(dutyStart, DUTY_DAYS - 1),
    })
    setDutyOpen(false)
  }

  const canEditEntry = (e: BazarEntry) => isManager || e.email === myEmail

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Bazar 🛒</h1>
          <p className="text-sm text-ink/50 font-medium">
            Groceries paid from a member's own pocket — credited to their balance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthPicker month={month} onChange={setMonth} />
          <motion.button whileTap={{ scale: 0.95 }} className="btn-primary px-4 py-2.5" onClick={openAdd}>
            <Plus size={16} /> Add bazar
          </motion.button>
        </div>
      </div>

      {/* Duty schedule */}
      <motion.div className="card p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold flex items-center gap-2">
            <CalendarRange size={18} className="text-mteal-500" /> Duty roster ({DUTY_DAYS}-day cycles)
          </h2>
          {isManager && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn-teal px-3 py-2 text-sm"
              onClick={() => {
                setDutyEmail(activeMembers[0]?.email ?? '')
                setDutyStart(now.date)
                setDutyOpen(true)
              }}
            >
              <Plus size={14} /> Assign
            </motion.button>
          )}
        </div>
        {duty.length === 0 ? (
          <p className="text-sm text-ink/45 font-medium">No duty assigned for this month yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {duty.map((d) => {
              const current = d.startDate <= now.date && now.date <= d.endDate
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
                  {isManager && (
                    <button
                      className="btn-ghost p-1.5 rounded-lg text-rose-500"
                      onClick={() => d.id && deleteDoc(doc(db, 'duty', d.id))}
                      title="Remove duty"
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

      {/* Member totals */}
      <motion.div
        className="card p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold flex items-center gap-2">
            <ShoppingBasket size={18} className="text-brand-500" /> Paid this month
          </h2>
          <span className="chip bg-brand-50 text-brand-700 text-sm">Total {fmtTk(grandTotal)}</span>
        </div>
        {totalsByMember.length === 0 ? (
          <p className="text-sm text-ink/45 font-medium">No bazar entries yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {totalsByMember.map(([em, amt]) => (
              <div key={em} className="flex items-center gap-2 rounded-2xl bg-ink/3 px-3 py-1.5">
                <Avatar name={nameOf(em)} size="sm" />
                <span className="font-bold text-sm">{nickOf(em)}</span>
                <span className="chip bg-mteal-500/10 text-mteal-600">{fmtTk(amt)}</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Entries */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <div className="space-y-4">
          {entriesByDate.map(([d, list]) => (
            <div key={d}>
              <div className="text-xs font-extrabold uppercase tracking-wider text-ink/40 mb-2 px-1">
                {dayLabel(d)}
              </div>
              <div className="space-y-3">
                {list.map((e) => (
                  <motion.div
                    key={e.id}
                    className="card p-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar name={nameOf(e.email)} size="sm" />
                      <span className="font-extrabold text-sm flex-1">{nickOf(e.email)}</span>
                      <span className="font-extrabold text-brand-600">{fmtTk(e.total)}</span>
                      {canEditEntry(e) && (
                        <div className="flex gap-1 no-print">
                          <button className="btn-ghost p-2 rounded-xl" onClick={() => openEdit(e)} title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn-ghost p-2 rounded-xl text-rose-500"
                            onClick={() => removeEntry(e)}
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {e.items.map((it, i) => (
                        <span key={i} className="chip bg-ink/4 text-ink/70">
                          {it.emoji} {it.name} · {it.qty} {it.unit} · {fmtTk(it.price)}
                        </span>
                      ))}
                    </div>
                    {e.note && <div className="text-xs text-ink/45 font-medium mt-2">📝 {e.note}</div>}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="card p-10 text-center text-ink/40 font-bold">
              No bazar recorded in this month yet. Tap "Add bazar" after shopping.
            </div>
          )}
        </div>
      )}

      {/* Add/edit entry modal */}
      <Modal
        open={entryOpen}
        onClose={() => setEntryOpen(false)}
        title={editingId ? 'Edit bazar entry' : 'Add bazar entry'}
        wide
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={date} max={now.date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Paid by</label>
              {isManager ? (
                <select className="input" value={payer} onChange={(e) => setPayer(e.target.value)}>
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
          </div>

          {/* picker */}
          <div>
            <label className="label">Pick items</label>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
              <input
                className="input pl-10"
                placeholder="Search the menu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {filteredMenu.map((m) => (
                <motion.button
                  key={m.name}
                  whileTap={{ scale: 0.93 }}
                  className="rounded-xl border border-ink/8 bg-white px-2 py-2 text-left hover:border-brand-400 hover:bg-brand-50/50 transition"
                  onClick={() => addItem(m.name, m.emoji, m.unit)}
                >
                  <div className="text-lg leading-none">{m.emoji}</div>
                  <div className="text-[11px] font-bold mt-1 leading-tight">{m.name}</div>
                </motion.button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="input"
                placeholder="Custom item name…"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <button
                className="btn-ghost px-4 shrink-0"
                onClick={() => {
                  if (customName.trim()) {
                    addItem(customName.trim(), '📦', 'pcs')
                    setCustomName('')
                  }
                }}
              >
                <Plus size={15} /> Add
              </button>
            </div>
          </div>

          {/* item rows */}
          {items.length > 0 && (
            <div className="space-y-2">
              <label className="label">Items in this bazar</label>
              {items.map((it) => (
                <div key={it.key} className="flex items-center gap-2 rounded-2xl bg-ink/3 p-2">
                  <span className="text-xl px-1">{it.emoji}</span>
                  <span className="font-bold text-xs flex-1 min-w-0 truncate">{it.name}</span>
                  <input
                    className="input !w-16 !px-2 !py-1.5 text-sm text-center"
                    type="number"
                    min={0}
                    step="any"
                    value={it.qty}
                    onChange={(e) => patchItem(it.key, { qty: Number(e.target.value) })}
                    title="Quantity"
                  />
                  <select
                    className="input !w-20 !px-1.5 !py-1.5 text-sm"
                    value={it.unit}
                    onChange={(e) => patchItem(it.key, { unit: e.target.value })}
                  >
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <input
                    className="input !w-20 !px-2 !py-1.5 text-sm text-center"
                    type="number"
                    min={0}
                    step="any"
                    value={it.price || ''}
                    placeholder="Tk"
                    onChange={(e) => patchItem(it.key, { price: Number(e.target.value) })}
                    title="Price (Tk)"
                  />
                  <button
                    className="btn-ghost p-1.5 rounded-lg text-rose-500"
                    onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              placeholder="e.g. Friday feast shopping"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-ink/8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-ink/40">Total</div>
              <div className="text-2xl font-extrabold text-brand-600">{fmtTk(total)}</div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="btn-primary px-6 py-3"
              onClick={saveEntry}
              disabled={items.length === 0 || saving}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save bazar'}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* Assign duty modal */}
      <Modal open={dutyOpen} onClose={() => setDutyOpen(false)} title="Assign bazar duty">
        <div className="space-y-4">
          <div>
            <label className="label">Member</label>
            <select className="input" value={dutyEmail} onChange={(e) => setDutyEmail(e.target.value)}>
              {activeMembers.map((m) => (
                <option key={m.email} value={m.email}>
                  {m.nickname}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Start date ({DUTY_DAYS} days)</label>
            <input className="input" type="date" value={dutyStart} onChange={(e) => setDutyStart(e.target.value)} />
            <p className="text-xs text-ink/45 font-medium mt-1.5">
              Covers {dayLabel(dutyStart)} → {dayLabel(addDays(dutyStart, DUTY_DAYS - 1))}
            </p>
          </div>
          <motion.button whileTap={{ scale: 0.95 }} className="btn-teal w-full py-3" onClick={saveDuty}>
            Assign duty
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
