// All settlement math runs on integer paisa (1 Tk = 100 paisa) so that
// floating-point drift can never make member totals disagree with the
// month totals. Rounding remainders are distributed deterministically.
import type { AbsenceDoc, BazarEntry, ExpenseDoc, MealDoc, Member } from '../types'
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
  expenses: ExpenseDoc,
  month: string,
  upto: string,
): Settlement {
  const mealCounts = activeMembers.map((m) => countMeals(meals, absences, m.email, month, upto))
  const totalMeals = mealCounts.reduce((s, c) => s + c, 0)
  const totalBazarPaisa = entries.reduce((s, e) => s + (e.totalPaisa || 0), 0)

  const mealCostParts = allocateByWeight(totalBazarPaisa, mealCounts)

  const billsPaisa =
    (expenses.wifiPaisa || 0) +
    (expenses.waterPaisa || 0) +
    (expenses.gasPaisa || 0) +
    (expenses.electricityPaisa || 0) +
    (expenses.newspaperPaisa || 0) +
    (expenses.dustbinPaisa || 0) +
    (expenses.otherPaisa || 0)
  // Bills and the total cook bill are one shared pot, split equally.
  const khalaTotalPaisa = expenses.khalaTotalPaisa || 0
  const utilityShares = splitEqual(billsPaisa + khalaTotalPaisa, activeMembers.length)

  const paidByMember = new Map<string, number>()
  for (const e of entries) {
    paidByMember.set(e.email, (paidByMember.get(e.email) ?? 0) + (e.totalPaisa || 0))
  }

  const rows: SettlementRow[] = activeMembers.map((m, i) => {
    const utilityPaisa = utilityShares[i]
    const duePaisa = mealCostParts[i] + utilityPaisa
    const bazarPaidPaisa = paidByMember.get(m.email) ?? 0
    return {
      email: m.email,
      name: m.name,
      nickname: m.nickname,
      meals: mealCounts[i],
      mealCostPaisa: mealCostParts[i],
      utilityPaisa,
      duePaisa,
      bazarPaidPaisa,
      balancePaisa: bazarPaidPaisa - duePaisa,
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
