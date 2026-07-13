import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { enablePush, pushSupported, refreshPushToken } from '../lib/notifications'

type Status = 'checking' | 'unsupported' | 'off' | 'on' | 'denied' | 'enabling'

export default function NotificationBell() {
  const { member, user } = useAuth()
  const email = (member?.email ?? user?.email ?? '').toLowerCase()
  const [status, setStatus] = useState<Status>('checking')

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supported = await pushSupported()
      if (cancelled) return
      if (!supported) {
        setStatus('unsupported')
        return
      }
      if (Notification.permission === 'granted') {
        setStatus('on')
        void refreshPushToken(email)
      } else if (Notification.permission === 'denied') {
        setStatus('denied')
      } else {
        setStatus('off')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [email])

  async function handleClick() {
    if (status !== 'off' || !email) return
    setStatus('enabling')
    const result = await enablePush(email)
    setStatus(result === 'granted' ? 'on' : result === 'denied' ? 'denied' : 'unsupported')
  }

  if (status === 'unsupported' || status === 'checking') return null

  const label =
    status === 'on'
      ? 'Reminders on — no escaping bazar duty now 😌'
      : status === 'denied'
        ? 'Notifications blocked — allow them in your browser settings to get bazar & cleaning nags'
        : status === 'enabling'
          ? 'Enabling…'
          : 'Enable reminders — bazar day & cleaning duty nags 🔔'

  return (
    <button
      type="button"
      className="btn-ghost p-2 rounded-xl"
      onClick={handleClick}
      disabled={status !== 'off'}
      title={label}
      aria-label={label}
    >
      {status === 'on' ? <BellRing size={16} className="text-brand-600" /> : <Bell size={16} />}
    </button>
  )
}
