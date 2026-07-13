// Handles push notifications while the app is closed or backgrounded.
// The web config below is the public client config (safe to expose — same
// values already shipped in the app bundle; access is protected by
// Firestore security rules, not by hiding this config).
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyDZ_YHNoeCxACtlaBB5KQXgo5vJddtCmKY',
  authDomain: 'haowa-bhobon.firebaseapp.com',
  projectId: 'haowa-bhobon',
  storageBucket: 'haowa-bhobon.firebasestorage.app',
  messagingSenderId: '965936203177',
  appId: '1:965936203177:web:57534f6f9246d16afd70b8',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Haowa Bhobon'
  const body = payload.notification?.body || ''
  self.registration.showNotification(title, {
    body,
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: payload.data?.tag || 'haowa-bhobon',
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.FCM_MSG?.data?.url || '/'
  event.waitUntil(clients.openWindow(url))
})
