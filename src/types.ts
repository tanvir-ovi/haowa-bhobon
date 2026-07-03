export type Role = 'admin' | 'manager' | 'member'

export interface Member {
  // Doc id. Lowercase email for real members; "pending-xxx" for members who
  // have no email yet (they show in reports but cannot log in).
  email: string
  name: string
  nickname: string
  phone: string
  role: Role
  active: boolean
}

export interface MealDoc {
  date: string // YYYY-MM-DD (Asia/Dhaka)
  month: string // YYYY-MM
  email: string
  lunch: boolean
  dinner: boolean
  guestsLunch?: number
  guestsDinner?: number
  guests?: number // legacy combined guest count, still honored in totals
}

// Long leave: meals auto-off over a date range without daily toggling.
// endDate '' = open-ended (until cancelled). Explicit day toggles override.
export interface AbsenceDoc {
  id?: string
  email: string
  lunch: boolean
  dinner: boolean
  startDate: string
  endDate: string // '' = until cancelled
  createdAt?: unknown
}

export interface BazarItem {
  name: string
  emoji: string
  qty: number
  unit: string
  price: number // Tk for this line
}

export interface BazarEntry {
  id?: string
  date: string
  month: string
  email: string // who paid (bazar duty member)
  items: BazarItem[]
  total: number // Tk
  note: string
  createdAt?: unknown
}

export interface ExpenseDoc {
  month: string
  wifi: number
  water: number
  gas: number
  electricity: number
  newspaper: number
  other: number
  otherNote: string
  khalaPerPerson: number
}

export interface DutyDoc {
  id?: string
  month: string // month of startDate
  email: string
  startDate: string
  endDate: string
}

// Immutable month-end snapshot written by Finalize (collection: months).
export interface MonthSnapshot {
  month: string
  finalizedBy: string
  finalizedAt?: unknown
  totalMeals: number
  totalBazarPaisa: number
  billsPaisa: number
  khalaPerPersonPaisa: number
  utilitiesPaisa: number
  ratePaisa: number
  rows: {
    email: string
    name: string
    nickname: string
    meals: number
    mealCostPaisa: number
    utilityPaisa: number
    duePaisa: number
    bazarPaidPaisa: number
    balancePaisa: number
  }[]
}
