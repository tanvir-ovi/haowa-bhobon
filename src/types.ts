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
  fcmTokens?: string[] // web push device tokens, registered from this browser
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

// All money is stored as integer paisa (1 Tk = 100 paisa) so stored
// amounts are never subject to floating-point drift.
export interface BazarItem {
  name: string
  emoji: string
  qty: number
  unit: string
  pricePaisa: number
}

export interface BazarEntry {
  id?: string
  date: string
  month: string
  email: string // who paid (bazar duty member)
  items: BazarItem[]
  totalPaisa: number
  note: string
  createdAt?: unknown
}

export type BillType =
  | 'wifi'
  | 'water'
  | 'gas'
  | 'electricity'
  | 'newspaper'
  | 'dustbin'
  | 'khala'
  | 'other'

// A single paid bill (wifi, a gas cylinder, one electricity recharge, the
// cook's monthly total, etc.), always tied to whoever actually paid it —
// same shape as a bazar entry — so it credits their balance. Electricity
// is prepaid and recharged at irregular amounts multiple times a month;
// modelling every bill as its own dated entry (instead of one lump sum
// per month) handles that for free.
export interface BillDoc {
  id?: string
  month: string
  type: BillType
  date: string
  email: string // who paid
  amountPaisa: number
  note: string
  createdAt?: unknown
}

// A custom bazar item a member added — becomes part of the shared menu.
export interface MenuItemDoc {
  id?: string
  name: string
  emoji: string
  unit: string
}

export interface DutyDoc {
  id?: string
  month: string // month of startDate
  email: string
  startDate: string
  endDate: string
}

// Washroom & basin cleaning roster (collection: cleaning).
export interface CleaningDoc {
  id?: string
  email: string
  round: number
  date: string // scheduled date, '' if unknown (old rounds)
  done: boolean
  doneDate: string // '' if not done or date unknown
}

// Immutable month-end snapshot written by Finalize (collection: months).
export interface MonthSnapshot {
  month: string
  finalizedBy: string
  finalizedAt?: unknown
  totalMeals: number
  totalBazarPaisa: number
  billsPaisa: number
  khalaTotalPaisa: number
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
    billsPaidPaisa: number
    balancePaisa: number
  }[]
}
