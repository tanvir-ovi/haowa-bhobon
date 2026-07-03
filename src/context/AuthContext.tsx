import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { auth, db, firebaseReady } from '../firebase'
import type { Member } from '../types'
import { BOOTSTRAP_ADMIN } from '../lib/constants'

interface AuthCtx {
  user: User | null
  member: Member | null
  members: Member[]
  activeMembers: Member[]
  loading: boolean
  isAdmin: boolean
  isManager: boolean
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null,
  member: null,
  members: [],
  activeMembers: [],
  loading: true,
  isAdmin: false,
  isManager: false,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [member, setMember] = useState<Member | null>(null)
  const [memberLoading, setMemberLoading] = useState(false)
  const [members, setMembers] = useState<Member[]>([])

  const email = user?.email?.toLowerCase() ?? ''
  const isBootstrap = email === BOOTSTRAP_ADMIN
  const isAdmin = isBootstrap || (member?.active === true && member.role === 'admin')
  const isManager = isAdmin || (member?.active === true && member.role === 'manager')
  const allowed = isBootstrap || member?.active === true

  useEffect(() => {
    if (!firebaseReady) {
      setAuthLoading(false)
      return
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthLoading(false)
    })
  }, [])

  // Step 1: membership check — every signed-in user may read only their own
  // member doc, so non-members never see the roster.
  useEffect(() => {
    if (!email) {
      setMember(null)
      return
    }
    setMemberLoading(true)
    return onSnapshot(
      doc(db, 'members', email),
      (snap) => {
        setMember(snap.exists() ? { ...(snap.data() as Member), email: snap.id } : null)
        setMemberLoading(false)
      },
      () => {
        setMember(null)
        setMemberLoading(false)
      },
    )
  }, [email])

  // Step 2: full roster — only after membership is confirmed.
  useEffect(() => {
    if (!allowed) {
      setMembers([])
      return
    }
    return onSnapshot(
      collection(db, 'members'),
      (snap) => {
        const list: Member[] = []
        snap.forEach((d) => list.push({ ...(d.data() as Member), email: d.id }))
        list.sort((a, b) => a.nickname.localeCompare(b.nickname))
        setMembers(list)
      },
      () => setMembers([]),
    )
  }, [allowed])

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      member,
      members,
      activeMembers: members.filter((m) => m.active),
      loading: authLoading || (Boolean(user) && memberLoading),
      isAdmin,
      isManager,
      logout: () => signOut(auth),
    }),
    [user, member, members, authLoading, memberLoading, isAdmin, isManager],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}
