import { useState } from 'react'
import { motion } from 'framer-motion'
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import {
  BadgeCheck,
  Lock,
  PieChart,
  Printer,
  Share2,
  ShoppingBasket,
  TrendingUp,
  Trash2,
  UtensilsCrossed,
  Zap,
} from 'lucide-react'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useAbsences, useBazar, useExpenses, useMeals, useMonthSnapshot } from '../hooks/useData'
import MonthPicker from '../components/MonthPicker'
import Avatar from '../components/Avatar'
import Skeleton from '../components/Skeleton'
import StatCard from '../components/StatCard'
import { computeSettlement, fmtPaisa, type Settlement } from '../lib/money'
import { daysInMonth, dhakaNow, monthLabel, monthOf } from '../lib/utils'
import { MESS_NAME } from '../lib/constants'

export default function Report() {
  const { activeMembers, member, user, isManager, isAdmin } = useAuth()
  const now = dhakaNow()
  const [month, setMonth] = useState(monthOf(now.date))
  const { meals, loading: mealsLoading } = useMeals(month)
  const { absences } = useAbsences()
  const { entries, loading: bazarLoading } = useBazar(month)
  const { expenses } = useExpenses(month)
  const { snapshot } = useMonthSnapshot(month)
  const [shareState, setShareState] = useState('')
  const myEmail = (member?.email ?? user?.email ?? '').toLowerCase()

  const isCurrent = month === monthOf(now.date)
  const upto = isCurrent ? now.date : `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
  const loading = mealsLoading || bazarLoading

  // Finalized months render from the immutable snapshot; live months compute.
  const live = computeSettlement(activeMembers, meals, absences, entries, expenses, month, upto)
  const data: Settlement = snapshot
    ? {
        month: snapshot.month,
        totalMeals: snapshot.totalMeals,
        totalBazarPaisa: snapshot.totalBazarPaisa,
        billsPaisa: snapshot.billsPaisa,
        khalaPerPersonPaisa: snapshot.khalaPerPersonPaisa,
        utilitiesPaisa: snapshot.utilitiesPaisa,
        ratePaisa: snapshot.ratePaisa,
        rows: snapshot.rows,
      }
    : live

  const rows = [...data.rows].sort((a, b) => b.balancePaisa - a.balancePaisa)

  function shareText(): string {
    const lines = [
      `${MESS_NAME} — Settlement · ${monthLabel(month)}`,
      `Bazar ${fmtPaisa(data.totalBazarPaisa)} · Meals ${data.totalMeals} · Rate ${fmtPaisa(data.ratePaisa)}/meal`,
      `Utilities ${fmtPaisa(data.utilitiesPaisa)} (incl. cook ${fmtPaisa(data.khalaPerPersonPaisa)}/person)`,
      '––––––––––––––––––',
      ...rows.map((r) => {
        const tag =
          r.balancePaisa > 0
            ? `receives ${fmtPaisa(r.balancePaisa)}`
            : r.balancePaisa < 0
              ? `pays ${fmtPaisa(-r.balancePaisa)}`
              : 'settled'
        return `${r.nickname}: ${r.meals} meals · due ${fmtPaisa(r.duePaisa)} · paid ${fmtPaisa(r.bazarPaidPaisa)} → ${tag}`
      }),
    ]
    return lines.join('\n')
  }

  async function share() {
    const text = shareText()
    try {
      if (navigator.share) {
        await navigator.share({ title: `${MESS_NAME} settlement`, text })
        setShareState('Shared ✓')
      } else {
        await navigator.clipboard.writeText(text)
        setShareState('Copied to clipboard ✓')
      }
    } catch {
      try {
        await navigator.clipboard.writeText(text)
        setShareState('Copied to clipboard ✓')
      } catch {
        setShareState('Could not share')
      }
    }
    setTimeout(() => setShareState(''), 2500)
  }

  async function finalize() {
    if (
      !window.confirm(
        `Finalize ${monthLabel(month)}? This freezes the settlement so later edits do not change it.`,
      )
    )
      return
    const batch = writeBatch(db)
    batch.set(doc(db, 'months', month), {
      ...live,
      finalizedBy: myEmail,
      finalizedAt: serverTimestamp(),
    })
    await batch.commit()
  }

  async function unfinalize() {
    if (!window.confirm(`Reopen ${monthLabel(month)}? The frozen settlement will be deleted.`)) return
    const batch = writeBatch(db)
    batch.delete(doc(db, 'months', month))
    await batch.commit()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Monthly Report 📊</h1>
          <p className="text-sm text-ink/50 font-medium">
            {snapshot
              ? 'Finalized — frozen settlement.'
              : isCurrent
                ? 'Live numbers — counted through today.'
                : 'Full month totals.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap no-print">
          <MonthPicker month={month} onChange={setMonth} />
          <motion.button whileTap={{ scale: 0.95 }} className="btn-teal px-4 py-2.5" onClick={share}>
            <Share2 size={16} /> Share
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="btn-ghost px-4 py-2.5"
            onClick={() => window.print()}
          >
            <Printer size={16} /> Print
          </motion.button>
        </div>
      </div>

      {shareState && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold px-4 py-2.5 no-print">
          {shareState}
        </div>
      )}

      {snapshot && (
        <div className="card p-4 flex items-center gap-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300/50">
          <BadgeCheck size={20} className="text-emerald-600 shrink-0" />
          <div className="flex-1 text-sm font-bold text-emerald-800">
            Month finalized by {snapshot.finalizedBy}. Numbers are frozen.
          </div>
          {isAdmin && (
            <button className="btn-ghost px-3 py-2 text-rose-600 text-sm no-print" onClick={unfinalize}>
              <Trash2 size={14} /> Reopen
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ShoppingBasket size={20} />} label="Total bazar" value={fmtPaisa(data.totalBazarPaisa)} accent="brand" />
        <StatCard icon={<UtensilsCrossed size={20} />} label="Total meals" value={String(data.totalMeals)} accent="teal" delay={0.05} />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Meal rate"
          value={fmtPaisa(data.ratePaisa)}
          sub="per meal"
          accent="sun"
          delay={0.1}
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Utilities"
          value={fmtPaisa(data.utilitiesPaisa)}
          sub="bills + cook"
          accent="ink"
          delay={0.15}
        />
      </div>

      {loading && !snapshot ? (
        <Skeleton className="h-80" />
      ) : (
        <motion.div
          className="card p-5 overflow-x-auto"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-extrabold mb-4 flex items-center gap-2">
            <PieChart size={18} className="text-brand-500" /> Settle up
          </h2>
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-ink/40 border-b border-ink/8">
                <th className="pb-2 pr-3">Member</th>
                <th className="pb-2 px-3 text-right">Meals</th>
                <th className="pb-2 px-3 text-right">Meal cost</th>
                <th className="pb-2 px-3 text-right">Utilities</th>
                <th className="pb-2 px-3 text-right">Total due</th>
                <th className="pb-2 px-3 text-right">Bazar paid</th>
                <th className="pb-2 pl-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.email}
                  className={`border-b border-ink/5 ${r.email === myEmail ? 'bg-brand-50/50' : ''}`}
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={r.name} size="sm" />
                      <span className="font-bold">{r.nickname}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{r.meals}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmtPaisa(r.mealCostPaisa)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums">{fmtPaisa(r.utilityPaisa)}</td>
                  <td className="py-2.5 px-3 text-right font-extrabold tabular-nums">{fmtPaisa(r.duePaisa)}</td>
                  <td className="py-2.5 px-3 text-right font-semibold tabular-nums text-mteal-600">
                    {fmtPaisa(r.bazarPaidPaisa)}
                  </td>
                  <td className="py-2.5 pl-3 text-right">
                    {r.balancePaisa > 0 ? (
                      <span className="chip bg-emerald-100 text-emerald-700">
                        To Receive {fmtPaisa(r.balancePaisa)}
                      </span>
                    ) : r.balancePaisa < 0 ? (
                      <span className="chip bg-rose-100 text-rose-700">
                        To Pay {fmtPaisa(-r.balancePaisa)}
                      </span>
                    ) : (
                      <span className="chip bg-ink/5 text-ink/50">Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[11px] text-ink/40 font-semibold mt-3">
            Meal cost is allocated proportionally to meals eaten; utilities are split equally.
            Balance = bazar paid − total due. All member rows always sum exactly to the month totals.
          </p>
        </motion.div>
      )}

      {isManager && !snapshot && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="btn-primary px-6 py-3 no-print"
          onClick={finalize}
        >
          <Lock size={16} /> Finalize {monthLabel(month)}
        </motion.button>
      )}
    </div>
  )
}
