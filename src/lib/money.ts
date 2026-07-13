// All settlement math runs on integer paisa (1 Tk = 100 paisa) so that
// floating-point drift can never make member totals disagree with the
// month totals. Rounding remainders are distributed deterministically.
import type { AbsenceDoc, BazarEntry, BillDoc, MealDoc, Member } from '../types'
import { countMeals, fmtTk } from './utils'

export const toPaisa = (tk: number): number => Math.round((tk || 0) * 100)

export const fmtPaisa = (paisa: number): string => fmtTk(paisa / 100)

// Split a total into n integer parts that sum exactly to the total.
// The first (total % n) parts get one extra paisa.
export function splitEqual(totalPaisa: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(totalPaisa / n)
  let remainder = totalPaisa - base * n
  return Array.from({ length: n }, () => base + (remainder-- > 0 ? 1 : 0))
}

// Largest-remainder allocation: parts are proportional to weights and sum
// exactly to totalPaisa. Ties break on lower index for determinism.
export function allocateByWeight(totalPaisa: number, weights: number[]): number[] {
  const weightSum = weights.reduce((s, w) => s + w, 0)
  if (weightSum <= 0) return weights.map(() => 0)
  const raw = weights.map((w) => (totalPaisa * w) / weightSum)
  const parts = raw.map(Math.floor)
  let remainder = totalPaisa - parts.reduce((s, v) => s + v, 0)
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (const { i } of order) {
    if (remainder <= 0) break
    parts[i] += 1
    remainder -= 1
  }
  return parts
}

export interface SettlementRow {
  email: string
  name: string
  nickname: string
  meals: number
  mealCostPaisa: number
  utilityPaisa: number
  duePaisa: number
  bazarPaidPaisa: number
  billsPaidPaisa: number
  balancePaisa: number // positive = To Receive, negative = To Pay
}

export interface Settlement {
  month: string
  totalMeals: number
  totalBazarPaisa: number
  billsPaisa: number
  khalaTotalPaisa: number
  utilitiesPaisa: number
  ratePaisa: number // per meal (display value)
  rows: SettlementRow[]
}

export function computeSettlement(
  activeMembers: Member[],
  meals: Map<string, MealDoc>,
  absences: AbsenceDoc[],
  entries: BazarEntry[],
  bills: BillDoc[],
  month: string,
  upto: string,
): Settlement {
  const mealCounts = activeMembers.map((m) => countMeals(meals, absences, m.email, month, upto))
  const totalMeals = mealCounts.reduce((s, c) => s + c, 0)
  const totalBazarPaisa = entries.reduce((s, e) => s + (e.totalPaisa || 0), 0)

  const mealCostParts = allocateByWeight(totalBazarPaisa, mealCounts)

  // Every bill (wifi, gas, an electricity recharge, the cook's total, …) is
  // its own dated, payer-attributed entry — same shape as a bazar entry.
  const billsPaisa = bills
    .filter((b) => b.type !== 'khala')
    .reduce((s, b) => s + (b.amountPaisa || 0), 0)
  const khalaTotalPaisa = bills
    .filter((b) => b.type === 'khala')
    .reduce((s, b) => s + (b.amountPaisa || 0), 0)
  // Bills and the total cook bill are one shared pot, split equally.
  const utilityShares = splitEqual(billsPaisa + khalaTotalPaisa, activeMembers.length)

  const paidByMember = new Map<string, number>()
  for (const e of entries) {
    paidByMember.set(e.email, (paidByMember.get(e.email) ?? 0) + (e.totalPaisa || 0))
  }
  const billsPaidByMember = new Map<string, number>()
  for (const b of bills) {
    billsPaidByMember.set(b.email, (billsPaidByMember.get(b.email) ?? 0) + (b.amountPaisa || 0))
  }

  const rows: SettlementRow[] = activeMembers.map((m, i) => {
    const utilityPaisa = utilityShares[i]
    const duePaisa = mealCostParts[i] + utilityPaisa
    const bazarPaidPaisa = paidByMember.get(m.email) ?? 0
    const billsPaidPaisa = billsPaidByMember.get(m.email) ?? 0
    return {
      email: m.email,
      name: m.name,
      nickname: m.nickname,
      meals: mealCounts[i],
      mealCostPaisa: mealCostParts[i],
      utilityPaisa,
      duePaisa,
      bazarPaidPaisa,
      billsPaidPaisa,
      balancePaisa: bazarPaidPaisa + billsPaidPaisa - duePaisa,
    }
  })

  return {
    month,
    totalMeals,
    totalBazarPaisa,
    billsPaisa,
    khalaTotalPaisa,
    utilitiesPaisa: billsPaisa + khalaTotalPaisa,
    ratePaisa: totalMeals > 0 ? totalBazarPaisa / totalMeals : 0,
    rows,
  }
}
