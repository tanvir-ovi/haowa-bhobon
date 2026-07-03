# Haowa Bhobon — Mess Manager

A realtime web app for running the Haowa Bhobon mess: daily meal on/off with
cutoff times, bazar (grocery) tracking with per-member spending, utility bills,
and automatic month-end settlement. Installable on Android and iOS as a PWA.

## Features

- **Meals** — every member is ON for lunch and dinner by default. Lunch can be
  turned off until **9:30 AM** and dinner until **6:00 PM** (Asia/Dhaka).
  Future days can be toggled any time. Guest meals supported. Manager can
  override locked days.
- **Bazar** — members record groceries bought with their own money using an
  emoji item picker (quantity, unit, price). The amount is credited to their
  balance. The manager assigns 3-day bazar duty cycles.
- **Bills** — Wi-Fi, water, gas, electricity, newspaper, cook bill
  (default Tk 500/person) and other costs, split equally among active members.
- **Report** — meal rate = total bazar ÷ total meals; per-member meal cost,
  utility share, and final **To Pay / To Receive** balance. All math runs on
  integer paisa with deterministic remainder distribution, so member rows always
  sum exactly to the month totals. Reports can be shared straight to WhatsApp
  via the system share sheet, printed, and finalized into an immutable snapshot.
- **Members** — email allowlist login (Google or email/password). Roles:
  admin, manager, member. Pending members (no email yet) count in reports but
  cannot log in.
- **Offline-first** — Firestore persistent cache; meal toggles apply instantly
  and sync when back online.

## Tech stack

React 18 + TypeScript + Vite, Tailwind CSS 4, Framer Motion, Firebase
(Authentication + Cloud Firestore + Hosting). Everything runs on free tiers.

## Setup (one time)

1. **Create a Firebase project** at <https://console.firebase.google.com>
   (any name, e.g. `haowa-bhobon`). Disable Analytics if asked.
2. **Authentication** → Get started → enable **Email/Password** and **Google**
   sign-in providers.
3. **Firestore Database** → Create database → production mode → region
   `asia-south1` (Mumbai) or nearest.
4. **Project settings → Your apps → Web** (`</>`): register an app and copy the
   config values.
5. In this folder, copy `.env.example` to `.env` and paste the values.
6. Deploy the security rules — either paste `firestore.rules` into
   Firestore → Rules in the console, or run:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use <your-project-id>
   firebase deploy --only firestore:rules
   ```

## Run locally

```bash
npm install
npm run dev
```

For phone preview on the same Wi-Fi:

```bash
npm run dev -- --host
```

then open the LAN URL that Vite prints (e.g. `http://192.168.0.101:5173`).

## First login

1. Sign in with **tanvirovi6@gmail.com** (Google button is easiest). This
   account is the bootstrap admin.
2. Go to **Members** → **Load roster** to seed all mess members.
3. Other members sign in with their listed email. Anyone not on the list is
   blocked automatically.

## Deploy (free hosting)

```bash
npm run build
firebase deploy --only hosting
```

The app is served at `https://<project-id>.web.app`. Members can then install
it from the browser menu ("Add to Home Screen") on Android and iOS.

To publish updates automatically on every push to GitHub, run
`firebase init hosting:github` once and accept the defaults — every push to
`main` builds and deploys the site.

## Monthly flow

1. Members toggle meals daily; bazar duty members record their shopping.
2. Manager enters utility bills any time during the month.
3. At month end, open **Report**, verify, press **Finalize**, and **Share**
   the settlement to the mess group.
