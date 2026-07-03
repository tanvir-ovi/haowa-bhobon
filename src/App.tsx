import { Navigate, Route, Routes } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import { firebaseReady } from './firebase'
import Layout from './components/Layout'
import Logo from './components/Logo'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Meals from './pages/Meals'
import Bazar from './pages/Bazar'
import Expenses from './pages/Expenses'
import Report from './pages/Report'
import Members from './pages/Members'
import { BOOTSTRAP_ADMIN, MESS_NAME } from './lib/constants'

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <motion.div
        className="card max-w-md w-full p-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {children}
      </motion.div>
    </div>
  )
}

function SetupScreen() {
  return (
    <CenterCard>
      <div className="flex justify-center mb-4">
        <Logo size={72} />
      </div>
      <h1 className="text-xl font-extrabold mb-2">Firebase not configured</h1>
      <p className="text-sm text-ink/60">
        Copy <code className="font-mono bg-ink/5 px-1 rounded">.env.example</code> to{' '}
        <code className="font-mono bg-ink/5 px-1 rounded">.env</code>, paste your Firebase web
        config values, then restart the dev server. Full steps are in{' '}
        <code className="font-mono bg-ink/5 px-1 rounded">README.md</code>.
      </p>
    </CenterCard>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
      >
        <Logo size={84} />
      </motion.div>
      <div className="font-bold text-lg text-ink/60">{MESS_NAME}</div>
    </div>
  )
}

function NotMember() {
  const { user, logout } = useAuth()
  return (
    <CenterCard>
      <div className="flex justify-center mb-4">
        <Logo size={72} />
      </div>
      <h1 className="text-xl font-extrabold mb-2">Not a mess member yet</h1>
      <p className="text-sm text-ink/60 mb-1">
        <span className="font-bold">{user?.email}</span> is not on the member list.
      </p>
      <p className="text-sm text-ink/60 mb-6">
        Ask the admin (<span className="font-bold">{BOOTSTRAP_ADMIN}</span>) to add your email,
        then sign in again.
      </p>
      <button className="btn-primary px-6 py-2.5" onClick={logout}>
        Log out
      </button>
    </CenterCard>
  )
}

export default function App() {
  const { user, member, loading, isAdmin } = useAuth()

  if (!firebaseReady) return <SetupScreen />
  if (loading) return <LoadingScreen />
  if (!user) return <Login />
  // Bootstrap admin may enter even before the roster is seeded.
  if (!member?.active && !isAdmin) return <NotMember />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="/meals" element={<Meals />} />
        <Route path="/bazar" element={<Bazar />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/report" element={<Report />} />
        <Route path="/members" element={<Members />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
