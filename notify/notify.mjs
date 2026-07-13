// Scheduled reminder bot for Haowa Bhobon — run periodically (see
// .github/workflows/mess-notifications.yml). Checks who's on bazar duty
// today and hasn't logged an entry, and who has cleaning duty today or
// tomorrow, then pushes a witty reminder via Firebase Cloud Messaging.
// Uses the Admin SDK, so it bypasses Firestore security rules entirely —
// this script must only ever run from a trusted, secret-holding context
// (GitHub Actions), never in the browser.
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()
const messaging = getMessaging()

const REMINDER_INTERVAL_MIN = 180 // re-nag every 3 hours until resolved
const QUIET_START_MIN = 8 * 60 // 08:00 Dhaka
const QUIET_END_MIN = 21 * 60 // 21:00 Dhaka
const APP_URL = 'https://haowa-bhobon.web.app'

function dhakaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '00'
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10),
  }
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

function monthOf(dateStr) {
  return dateStr.slice(0, 7)
}

const BAZAR_MESSAGES = [
  "🛒 Psst — today's your bazar day. The fridge is already placing bets on when you'll show up.",
  '🛒 Reminder #2: still no bazar logged. Even the rice is getting suspicious.',
  '🛒 This is your bazar duty speaking. I will not be ignored. 😤',
  '🛒 Legend says a mess member once forgot bazar duty. Nobody saw them again. Don\'t be that legend.',
]

const CLEANING_NEXT_MESSAGE =
  '🧽 Heads up — tomorrow the washroom throne passes to YOU. Wear your bravest gloves.'

const CLEANING_DUE_MESSAGES = [
  "🧹 Today's the day. The washroom awaits its hero (that's you).",
  "🧹 Gentle nudge #2 — the basin has feelings, and right now they're hurt.",
  '🧹 The washroom has officially filed a complaint. Please resolve at your earliest inconvenience.',
]

const CLEANING_OVERDUE_MESSAGES = [
  '🧹 Your cleaning turn was due a bit ago. The mold is starting a fan club.',
  "🧹 Still overdue. Somewhere, a sponge is crying.",
]

async function shouldSend(logId, intervalMin) {
  const ref = db.collection('notifyLog').doc(logId)
  const snap = await ref.get()
  if (!snap.exists) return { send: true, ref, count: 0 }
  const data = snap.data()
  const last = Date.parse(data.lastSentAt || 0)
  const elapsedMin = (Date.now() - last) / 60000
  return { send: elapsedMin >= intervalMin, ref, count: data.count || 0 }
}

async function recordSent(ref, count) {
  await ref.set({ lastSentAt: new Date().toISOString(), count: count + 1 }, { merge: true })
}

async function sendTo(email, title, body) {
  const memberRef = db.collection('members').doc(email)
  const snap = await memberRef.get()
  const tokens = snap.exists ? snap.data().fcmTokens || [] : []
  if (tokens.length === 0) {
    console.log(`  (no registered device for ${email}, skipped push)`)
    return
  }
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: { fcmOptions: { link: APP_URL } },
  })
  const dead = []
  res.responses.forEach((r, i) => {
    if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
      dead.push(tokens[i])
    }
  })
  if (dead.length > 0) {
    await memberRef.update({ fcmTokens: FieldValue.arrayRemove(...dead) })
  }
  console.log(`  -> ${email}: ${res.successCount}/${tokens.length} delivered`)
}

async function checkBazarDuty(today) {
  const dutySnap = await db.collection('duty').where('month', '==', monthOf(today)).get()
  const dutyToday = dutySnap.docs
    .map((d) => d.data())
    .find((d) => d.startDate <= today && today <= d.endDate)
  if (!dutyToday) return

  const bazarSnap = await db
    .collection('bazar')
    .where('date', '==', today)
    .where('email', '==', dutyToday.email)
    .limit(1)
    .get()
  if (!bazarSnap.empty) return // already logged today

  const { send, ref, count } = await shouldSend(`bazar_${today}_${dutyToday.email}`, REMINDER_INTERVAL_MIN)
  if (!send) return
  const msg = BAZAR_MESSAGES[Math.min(count, BAZAR_MESSAGES.length - 1)]
  console.log(`Bazar reminder -> ${dutyToday.email}`)
  await sendTo(dutyToday.email, 'Bazar duty 🛒', msg)
  await recordSent(ref, count)
}

async function checkCleaningDuty(today) {
  const tomorrow = addDays(today, 1)
  const cleaningSnap = await db.collection('cleaning').where('done', '==', false).get()

  for (const docSnap of cleaningSnap.docs) {
    const c = docSnap.data()
    if (!c.date || !c.email) continue

    if (c.date === tomorrow) {
      const logId = `cleaning_next_${docSnap.id}`
      const ref = db.collection('notifyLog').doc(logId)
      const exists = (await ref.get()).exists
      if (!exists) {
        console.log(`Cleaning "next is yours" -> ${c.email}`)
        await sendTo(c.email, 'Washroom duty tomorrow 🧽', CLEANING_NEXT_MESSAGE)
        await recordSent(ref, 0)
      }
      continue
    }

    if (c.date <= today) {
      const overdue = c.date < today
      const { send, ref, count } = await shouldSend(`cleaning_due_${docSnap.id}`, REMINDER_INTERVAL_MIN)
      if (!send) continue
      const pool = overdue ? CLEANING_OVERDUE_MESSAGES : CLEANING_DUE_MESSAGES
      const msg = pool[Math.min(count, pool.length - 1)]
      console.log(`Cleaning ${overdue ? 'overdue' : 'due today'} -> ${c.email}`)
      await sendTo(c.email, 'Washroom duty 🧹', msg)
      await recordSent(ref, count)
    }
  }
}

async function main() {
  const now = dhakaNow()
  const force = process.env.FORCE_RUN === 'true'
  if (!force && (now.minutes < QUIET_START_MIN || now.minutes >= QUIET_END_MIN)) {
    console.log(`Quiet hours (${now.date}, ${now.minutes}min) — skipping this run.`)
    return
  }
  console.log(`Checking reminders for ${now.date}…`)
  await checkBazarDuty(now.date)
  await checkCleaningDuty(now.date)
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
