import { useState } from 'react'
import { motion } from 'framer-motion'
import { deleteDoc, doc, writeBatch } from 'firebase/firestore'
import { Pencil, Phone, Plus, ShieldCheck, Sparkles, Trash2, UserCheck, UserX } from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { isRealEmail, SEED_MEMBERS } from '../lib/constants'
import type { Member, Role } from '../types'

const ROLE_STYLES: Record<Role, string> = {
  admin: 'bg-brand-100 text-brand-700',
  manager: 'bg-mteal-500/15 text-mteal-600',
  member: 'bg-ink/5 text-ink/55',
}

const emptyForm: Member = {
  email: '',
  name: '',
  nickname: '',
  phone: '',
  role: 'member',
  active: true,
}

export default function Members() {
  const { members, member: me, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const [original, setOriginal] = useState<Member | null>(null)
  const [form, setForm] = useState<Member>(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function openAdd() {
    setOriginal(null)
    setForm(emptyForm)
    setError('')
    setOpen(true)
  }

  function openEdit(m: Member) {
    setOriginal(m)
    setForm({ ...m, email: isRealEmail(m.email) ? m.email : '' })
    setError('')
    setOpen(true)
  }

  // Pending members (no email yet) get a stable non-email doc id so they can
  // never be logged into, but still count in meals and bills.
  function docIdFor(f: Member): string {
    const email = f.email.trim().toLowerCase()
    if (email) return email
    return original && !isRealEmail(original.email)
      ? original.email
      : `pending-${f.nickname.trim().toLowerCase().replace(/\s+/g, '-') || Date.now()}`
  }

  async function save() {
    const name = form.name.trim()
    const nickname = form.nickname.trim() || name.split(' ')[0]
    const email = form.email.trim().toLowerCase()
    if (!name) {
      setError('Name is required.')
      return
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setError('That email looks invalid. Leave it empty for a pending member.')
      return
    }
    const id = docIdFor({ ...form, email, nickname })
    if (members.some((m) => m.email === id && m.email !== original?.email)) {
      setError('A member with this email already exists.')
      return
    }
    setSaving(true)
    try {
      const batch = writeBatch(db)
      const data = { name, nickname, email: id, phone: form.phone.trim(), role: form.role, active: form.active }
      batch.set(doc(db, 'members', id), data)
      if (original && original.email !== id) batch.delete(doc(db, 'members', original.email))
      await batch.commit()
      setOpen(false)
    } catch {
      setError('Could not save. Check your permissions and connection.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(m: Member) {
    const batch = writeBatch(db)
    batch.set(doc(db, 'members', m.email), { ...m, active: !m.active })
    await batch.commit()
  }

  async function remove(m: Member) {
    if (!window.confirm(`Remove ${m.name} from the mess? Their history stays in old reports.`)) return
    await deleteDoc(doc(db, 'members', m.email))
  }

  async function seed() {
    if (!window.confirm(`Load the default Haowa Bhobon roster (${SEED_MEMBERS.length} members)?`)) return
    const batch = writeBatch(db)
    for (const m of SEED_MEMBERS) {
      const { email, ...rest } = m
      batch.set(doc(db, 'members', email), { email, ...rest })
    }
    await batch.commit()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Members 👥</h1>
          <p className="text-sm text-ink/50 font-medium">
            {members.filter((m) => m.active).length} active · only listed emails can log in — no
            gatecrashing the mess. 🚪
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {members.length === 0 && (
              <motion.button whileTap={{ scale: 0.95 }} className="btn-teal px-4 py-2.5" onClick={seed}>
                <Sparkles size={16} /> Load roster
              </motion.button>
            )}
            <motion.button whileTap={{ scale: 0.95 }} className="btn-primary px-4 py-2.5" onClick={openAdd}>
              <Plus size={16} /> Add member
            </motion.button>
          </div>
        )}
      </div>

      {members.length === 0 && !isAdmin && (
        <div className="card p-10 text-center text-ink/40 font-bold">No members yet.</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m, i) => (
          <motion.div
            key={m.email}
            className={`card p-5 ${m.active ? '' : 'opacity-60'}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: m.active ? 1 : 0.6, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <div className="flex items-start gap-3">
              <Avatar name={m.name} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="font-extrabold truncate">
                  {m.name}
                  {m.email === me?.email && <span className="text-ink/35 text-xs font-bold"> (me)</span>}
                </div>
                <div className="text-xs font-semibold text-ink/45 truncate">
                  {isRealEmail(m.email) ? m.email : 'No email yet — cannot log in'}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className={`chip ${ROLE_STYLES[m.role]}`}>
                    {m.role === 'admin' && <ShieldCheck size={11} />}
                    {m.role}
                  </span>
                  {!m.active && <span className="chip bg-rose-100 text-rose-600">inactive</span>}
                  {!isRealEmail(m.email) && <span className="chip bg-sun-300/50 text-amber-800">pending</span>}
                </div>
                {m.phone && (
                  <div className="text-xs font-semibold text-ink/50 mt-2 flex items-center gap-1">
                    <Phone size={11} /> {m.phone}
                  </div>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-1.5 mt-4 pt-3 border-t border-ink/6 no-print">
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => openEdit(m)}>
                  <Pencil size={12} /> Edit
                </button>
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => toggleActive(m)}>
                  {m.active ? <UserX size={12} /> : <UserCheck size={12} />}
                  {m.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="btn-ghost px-3 py-1.5 text-xs text-rose-600 ml-auto"
                  onClick={() => remove(m)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={original ? 'Edit member' : 'Add member'}>
        <div className="space-y-4">
          <div>
            <label className="label">Full name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Tanvir Hossain Ovi"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nickname</label>
              <input
                className="input"
                value={form.nickname}
                onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                placeholder="e.g. Ovi"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </div>
          <div>
            <label className="label">Email (login) — leave empty if unknown</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="member@gmail.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
              >
                <option value="member">member</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <label className="flex items-center gap-2 font-bold text-sm text-ink/60 pb-2.5 cursor-pointer">
              <input
                type="checkbox"
                className="accent-brand-600 w-4 h-4"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active member
            </label>
          </div>
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold px-4 py-2.5">
              {error}
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="btn-primary w-full py-3"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving…' : original ? 'Save changes' : 'Add member'}
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
