import type { MealDoc } from '../types'
import { LUNCH_CUTOFF_MIN, DINNER_CUTOFF_MIN, AVATAR_COLORS } from './constants'

export interface DhakaNow {
  date: string // YYYY-MM-DD
  minutes: number // minutes since midnight
  hh: string
  mm: string
  ss: string
}

// Current time in Asia/Dhaka regardless of device timezone.
export function dhakaNow(): DhakaNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const date = `${get('year')}-${get('month')}-${get('day')}`
  return {
    date,
    minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10),
    hh: get('hour'),
    mm: get('minute'),
    ss: get('second'),
  }
}

export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

export function datesOfMonth(month: string, upto?: string): string[] {
  const n = daysInMonth(month)
  const out: string[] = []
  for (let d = 1; d <= n; d++) {
    const ds = `${month}-${String(d).padStart(2, '0')}`
    if (upto && ds > upto) break
    out.push(ds)
  }
  return out
}

export function prevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 2, 1))
  return dt.toISOString().slice(0, 7)
}

export function nextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m, 1))
  return dt.toISOString().slice(0, 7)
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

export function weekdayOfFirst(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
}

// Can this meal still be changed? Future = yes, past = no,
// today = only before its cutoff (Dhaka time).
export function canToggle(dateStr: string, meal: 'lunch' | 'dinner', now: DhakaNow): boolean {
  if (dateStr > now.date) return true
  if (dateStr < now.date) return false
  const cutoff = meal === 'lunch' ? LUNCH_CUTOFF_MIN : DINNER_CUTOFF_MIN
  return now.minutes < cutoff
}

export function minutesToCutoff(meal: 'lunch' | 'dinner', now: DhakaNow): number {
  const cutoff = meal === 'lunch' ? LUNCH_CUTOFF_MIN : DINNER_CUTOFF_MIN
  return cutoff - now.minutes
}

export function mealKey(date: string, email: string): string {
  return `${date}_${email}`
}

// Meals for one member across a month (missing doc = both meals ON).
export function countMeals(
  map: Map<string, MealDoc>,
  email: string,
  month: string,
  upto: string,
): number {
  let total = 0
  for (const date of datesOfMonth(month, upto)) {
    const doc = map.get(mealKey(date, email))
    total += (doc?.lunch ?? true ? 1 : 0) + (doc?.dinner ?? true ? 1 : 0) + (doc?.guests ?? 0)
  }
  return total
}

export function fmtTk(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const rounded = Math.round(abs * 100) / 100
  return `${sign}৳${rounded.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function fmtDuration(mins: number): string {
  if (mins <= 0) return 'locked'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
