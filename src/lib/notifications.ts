import { getApp } from 'firebase/app'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { arrayUnion, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const VAPID_KEY = import.meta.env.VITE_FB_VAPID_KEY as string | undefined

export async function pushSupported(): Promise<boolean> {
  if (!VAPID_KEY) return false
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return false
  }
  try {
    return await isSupported()
  } catch {
    return false
  }
}

async function registerToken(email: string): Promise<string | null> {
  if (!VAPID_KEY) return null
  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const messaging = getMessaging(getApp())
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg })
  if (!token) return null
  await setDoc(doc(db, 'members', email), { fcmTokens: arrayUnion(token) }, { merge: true })
  return token
}

// Must run from a user gesture (button click) — triggers the browser's
// permission prompt, then registers this device's push token.
export async function enablePush(email: string): Promise<'granted' | 'denied' | 'unsupported'> {
  if (!(await pushSupported())) return 'unsupported'
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'unsupported'
  await registerToken(email)
  return 'granted'
}

// Runs silently on app load when permission is already granted, since FCM
// tokens can rotate and a stale one would silently stop receiving pushes.
export async function refreshPushToken(email: string): Promise<void> {
  if (!(await pushSupported())) return
  if (Notification.permission !== 'granted') return
  try {
    await registerToken(email)
  } catch {
    // Best-effort — a failed refresh just means the old token keeps trying.
  }
}
