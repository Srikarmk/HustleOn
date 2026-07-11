# HustleOn

A React Native (Expo) fitness tracking app — workout logging, calorie tracking, BMI/body metrics, monthly summaries, and an AI fitness coach powered by Google Gemini. Local-first with background cloud sync to Supabase, real email/password auth, and iOS local notifications + app-icon badges.

> **Platform:** iOS-first (notifications + badges are iOS-only). Android/web run via Expo but aren't the target.

---

## Features

- **Workout tracker** — "I worked out today", streaks, weekly goal, calendar history, supplement tracker
- **Calorie tracker** — log meals, AI food analysis (calories + macros), daily goal
- **Body tracking** — BMI, body composition, body measurements, progress photos, trend charts
- **Monthly summary** — workout stats, weekly breakdown, day-of-week distribution, AI insights
- **AI coach** — free-form fitness chat (persisted), plus per-screen AI advice
- **Profile & settings** — goals, integrations (placeholder), notification prefs, privacy, GDPR export
- **Cloud sync** — data + photos sync across devices (Supabase), works offline
- **Auth** — real Supabase email/password (Apple + Google sign-in planned)

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React Native `0.81` + Expo `~54` |
| Language | TypeScript |
| Navigation | React Navigation v7 (bottom-tabs, native-stack) |
| State | Zustand + AsyncStorage (local source of truth) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| AI | Google Gemini 2.5 Flash (via Supabase Edge Function proxy) |
| Notifications | `expo-notifications` (iOS local notifications + badges) |

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Xcode** + iOS Simulator (for `npm run ios`)
- **Supabase CLI** — `brew install supabase/tap/supabase`
- A **Supabase project** (already provisioned: ref `xwpiwpozjhrzepxbtgaf`)
- A **Google Gemini API key** (stored as a Supabase secret, **not** in the app)
- *(Phase 4)* **Apple Developer Program** enrollment for TestFlight

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment (optional)
The Supabase URL + anon key have working defaults baked into `app.config.js`. To override per-environment, copy `env.example` to `.env`:
```bash
cp env.example .env
# Optional: SUPABASE_URL=..., SUPABASE_ANON_KEY=...
```
> The Gemini key is **not** an app env var — it's a server-side Supabase secret (see step 3).

### 3. Provision the backend
Follow [`supabase/README.md`](supabase/README.md) to:
1. Run the SQL migration (`supabase/migrations/0001_init.sql`) — creates tables, RLS, and the photo Storage bucket.
2. Deploy the `gemini-proxy` Edge Function and set the `GEMINI_API_KEY` secret.

### 4. Run the app
```bash
npm run ios       # iOS Simulator (recommended)
npm start         # Expo dev server (choose a target)
npm test          # Run the Jest test suite
```

On first launch you'll go through onboarding → sign up / log in → the main tabs. AI features and cross-device sync require step 3 to be complete.

---

## Project Structure

```
App.tsx                      # Root: auth/onboarding gating, sync + notification lifecycle
app.config.js                # Expo config (Supabase public values in `extra`)
src/
├── lib/
│   ├── supabase.ts           # Supabase client (AsyncStorage session persistence)
│   └── sync.ts               # Cloud sync (pull/push, last-write-wins, photo upload)
├── context/AuthContext.tsx   # AuthProvider — session, signIn/signUp/signOut
├── config/gemini.ts          # AI client → calls the gemini-proxy Edge Function
├── store/index.ts            # Zustand store + AsyncStorage I/O + sync clock
├── types/index.ts            # All TypeScript types + nav params
├── navigation/               # Onboarding / Auth / Main navigators
├── components/               # FloatingAIButton
├── constants/theme.ts        # COLORS, SIZES
└── screens/                  # Onboarding, Auth, Workout, Calorie, BMI, Summary, Profile, AI
supabase/
├── migrations/0001_init.sql  # Schema + RLS + Storage bucket
└── functions/gemini-proxy/   # Edge Function holding the Gemini key
```

---

## Architecture Notes

- **Local-first:** the Zustand store (persisted to one AsyncStorage blob, `@hustleon:app_data`) is the source of truth. The app is fully usable offline.
- **Cloud sync:** `src/lib/sync.ts` mirrors the store to Supabase using a single `dataUpdatedAt` clock and **whole-account last-write-wins** (remote-newer → pull, local-newer → push). Runs on launch, on foreground, and debounced after edits. *Caveat: not per-row CRDT — the last device to sync wins the account if two edit while offline.*
- **Photos:** progress photos + profile pictures upload to the public `progress-photos` Storage bucket (per-user folders, RLS-scoped); local `file://` URIs are swapped for public URLs before push.
- **AI:** the Gemini key never ships in the bundle. `generateGeminiResponse()` calls the `gemini-proxy` Edge Function, which verifies the caller's JWT and forwards to Gemini.
- **Auth:** Supabase email/password; session persisted + auto-refreshed via `AuthContext`.

See [`CLAUDE.md`](CLAUDE.md) for the full architecture/audit reference and [`TODO.md`](TODO.md) for outstanding work.

---

## Roadmap

| Phase | Status |
|-------|--------|
| 0 — Bug cleanup (audit medium/low) | ✅ Done |
| 1a — Supabase email/password auth | ✅ Done |
| 2 — Local-first cloud sync (tables, RLS, Storage) | ✅ Done — *run the SQL migration* |
| 3 — Gemini behind Edge Function | ✅ Done — *deploy the function + set the secret* |
| Multi-turn AI memory | ✅ Done — AI coach is conversational |
| 4 — Build config (eas.json, privacy manifest) | ✅ Done — *fill Apple IDs + confirm bundle id, then `eas build`* |
| 1b — Apple + Google Sign-In | ⏳ Needs Google OAuth client ID + Apple enrollment |
| 4 — EAS Build → TestFlight (run) | ⏳ Gated on Apple Developer enrollment |

See [`docs/app-store-checklist.md`](docs/app-store-checklist.md) for the TestFlight runbook.
