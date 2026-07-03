import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '../firebase'
import Logo from '../components/Logo'
import { APP_TAGLINE, MESS_NAME } from '../lib/constants'

const FRIENDLY: Record<string, string> = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/user-not-found': 'No account with this email. Create one first.',
  'auth/wrong-password': 'Wrong password.',
  'auth/email-already-in-use': 'Account already exists. Sign in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'That email address looks invalid.',
  'auth/too-many-requests': 'Too many attempts. Wait a bit and try again.',
  'auth/popup-closed-by-user': 'Google popup was closed before finishing.',
}

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<unknown>) {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await fn()
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? ''
      setError(FRIENDLY[code] ?? `Something went wrong (${code || 'unknown error'}).`)
    } finally {
      setBusy(false)
    }
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const em = email.trim().toLowerCase()
    run(() =>
      mode === 'signin'
        ? signInWithEmailAndPassword(auth, em, password)
        : createUserWithEmailAndPassword(auth, em, password),
    )
  }

  const google = () => run(() => signInWithPopup(auth, new GoogleAuthProvider()))

  const reset = () => {
    const em = email.trim().toLowerCase()
    if (!em) {
      setError('Type your email first, then press "Forgot password".')
      return
    }
    run(async () => {
      await sendPasswordResetEmail(auth, em)
      setInfo('Password reset email sent. Check your inbox.')
    })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <motion.div
        className="card w-full max-w-md p-8"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center mb-6">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Logo size={92} />
          </motion.div>
          <h1 className="text-3xl font-extrabold mt-3">{MESS_NAME}</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink/40 mt-1">
            {APP_TAGLINE}
          </p>
        </div>

        <div className="flex rounded-2xl bg-ink/5 p-1 mb-5">
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m)
                setError('')
                setInfo('')
              }}
              className={`flex-1 rounded-xl py-2 text-sm font-bold transition
                ${mode === m ? 'bg-white shadow text-brand-600' : 'text-ink/50'}`}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@gmail.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold px-4 py-2.5">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-2.5">
              {info}
            </div>
          )}

          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px flex-1 bg-ink/10" />
          <span className="text-xs font-bold text-ink/35">OR</span>
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        <button className="btn-ghost w-full py-3 border border-ink/10" onClick={google} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
          Continue with Google
        </button>

        <button
          className="w-full text-center text-xs font-bold text-ink/40 hover:text-brand-600 mt-4 transition"
          onClick={reset}
          disabled={busy}
        >
          Forgot password?
        </button>
      </motion.div>
    </div>
  )
}
