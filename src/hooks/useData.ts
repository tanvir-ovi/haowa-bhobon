import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import type {
  AbsenceDoc,
  BazarEntry,
  DutyDoc,
  ExpenseDoc,
  MealDoc,
  MenuItemDoc,
  MonthSnapshot,
} from '../types'
import { KHALA_DEFAULT_PAISA } from '../lib/constants'

export function useMeals(month: string): { meals: Map<string, MealDoc>; loading: boolean } {
  const [meals, setMeals] = useState<Map<string, MealDoc>>(new Map())
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'meals'), where('month', '==', month))
    return onSnapshot(
      q,
      (snap) => {
        const m = new Map<string, MealDoc>()
        snap.forEach((d) => m.set(d.id, d.data() as MealDoc))
        setMeals(m)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [month])
  return { meals, loading }
}

export function useBazar(month: string): { entries: BazarEntry[]; loading: boolean } {
  const [entries, setEntries] = useState<BazarEntry[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'bazar'), where('month', '==', month))
    return onSnapshot(
      q,
      (snap) => {
        const list: BazarEntry[] = []
        snap.forEach((d) => list.push({ ...(d.data() as BazarEntry), id: d.id }))
        list.sort((a, b) => b.date.localeCompare(a.date))
        setEntries(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [month])
  return { entries, loading }
}

export function emptyExpenses(month: string): ExpenseDoc {
  return {
    month,
    wifiPaisa: 0,
    waterPaisa: 0,
    gasPaisa: 0,
    electricityPaisa: 0,
    newspaperPaisa: 0,
    otherPaisa: 0,
    otherNote: '',
    khalaTotalPaisa: KHALA_DEFAULT_PAISA,
  }
}

export function useExpenses(month: string): { expenses: ExpenseDoc; loading: boolean } {
  const [expenses, setExpenses] = useState<ExpenseDoc>(emptyExpenses(month))
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    setExpenses(emptyExpenses(month))
    return onSnapshot(
      doc(db, 'expenses', month),
      (snap) => {
        if (snap.exists()) {
          setExpenses({ ...emptyExpenses(month), ...(snap.data() as Partial<ExpenseDoc>) })
        }
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [month])
  return { expenses, loading }
}

export function useDuty(month: string): { duty: DutyDoc[]; loading: boolean } {
  const [duty, setDuty] = useState<DutyDoc[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'duty'), where('month', '==', month))
    return onSnapshot(
      q,
      (snap) => {
        const list: DutyDoc[] = []
        snap.forEach((d) => list.push({ ...(d.data() as DutyDoc), id: d.id }))
        list.sort((a, b) => a.startDate.localeCompare(b.startDate))
        setDuty(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [month])
  return { duty, loading }
}

export function useMonthSnapshot(month: string): {
  snapshot: MonthSnapshot | null
  loading: boolean
} {
  const [snapshot, setSnapshot] = useState<MonthSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    setSnapshot(null)
    return onSnapshot(
      doc(db, 'months', month),
      (snap) => {
        setSnapshot(snap.exists() ? (snap.data() as MonthSnapshot) : null)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [month])
  return { snapshot, loading }
}

// Custom menu items added by members, merged with the built-in menu.
export function useMenu(): { customMenu: MenuItemDoc[]; loading: boolean } {
  const [customMenu, setCustomMenu] = useState<MenuItemDoc[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    return onSnapshot(
      collection(db, 'menu'),
      (snap) => {
        const list: MenuItemDoc[] = []
        snap.forEach((d) => list.push({ ...(d.data() as MenuItemDoc), id: d.id }))
        list.sort((a, b) => a.name.localeCompare(b.name))
        setCustomMenu(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [])
  return { customMenu, loading }
}

// Away ranges are few and can span months, so subscribe to all of them.
export function useAbsences(): { absences: AbsenceDoc[]; loading: boolean } {
  const [absences, setAbsences] = useState<AbsenceDoc[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    return onSnapshot(
      collection(db, 'absences'),
      (snap) => {
        const list: AbsenceDoc[] = []
        snap.forEach((d) => list.push({ ...(d.data() as AbsenceDoc), id: d.id }))
        list.sort((a, b) => a.startDate.localeCompare(b.startDate))
        setAbsences(list)
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [])
  return { absences, loading }
}

// Re-render on an interval — used for the live clock and cutoff countdowns.
export function useTick(intervalMs = 1000): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return tick
}
