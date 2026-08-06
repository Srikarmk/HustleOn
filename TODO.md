# HustleOn — TODO

Status tracker. ✅ = done in code, ⏳ = blocked/pending, ☐ = not started.
See [`README.md`](README.md) for setup and [`CLAUDE.md`](CLAUDE.md) for the full audit/architecture.

---

## ▶️ Next up (recommended sequence)

1. **You:** run the Supabase manual steps below (2 migrations + 2 functions + secret) → unlocks live end-to-end verification.
2. **You:** host Privacy Policy + Terms pages and update the placeholder URLs in `ProfileScreen.tsx` (Tier-1 App Store blocker).
3. **You, when Apple enrollment clears:** confirm the bundle id, run `eas init`, fill the Apple IDs in `eas.json`, then `eas build` → `eas submit`. See [`docs/app-store-checklist.md`](docs/app-store-checklist.md).
4. **You + me:** Phase 1b (Apple + Google sign-in) — needs a Google iOS OAuth client ID from you.

Full ship checklist: [`docs/production-readiness.md`](docs/production-readiness.md).

---

## 🚨 Manual steps required (you must do these — code is ready)

- [ ] **Run the SQL migrations** — `0001_init.sql` then `0002_production.sql` in the Supabase SQL Editor. *Without 0001, cloud sync fails silently; 0002 makes photos private + adds AI rate-limiting.*
- [ ] **Deploy the Edge Functions** — `supabase functions deploy gemini-proxy` and `supabase functions deploy delete-account`.
- [ ] **Set the Gemini secret** — `supabase secrets set GEMINI_API_KEY=AIza...`
- [ ] *(dev)* Disable email confirmation in Supabase Auth so signup logs in immediately.

See [`supabase/README.md`](supabase/README.md) for exact commands, and [`docs/production-readiness.md`](docs/production-readiness.md) for the full ship checklist.

---

## ✅ Done

### Audit bug fixes
- [x] #1 `NotificationPreference` import in ProfileScreen
- [x] #2 `saveProfile()` persists profile; "Save Changes" wired
- [x] #3 Logout updates in-memory auth state (no restart)
- [x] #4 `loadData()` called once (centralized in `App.tsx`)
- [x] #5 Removed duplicate StyleSheet keys in ProfileScreen
- [x] #6 Gemini key removed from bundle (Edge Function proxy)
- [x] #7 Removed unused `expo-linear-gradient`
- [x] #8 Body fat uses real age + gender
- [x] #9 `predictTrajectory` uses the user's goal weight
- [x] #10 Streak survives "haven't worked out yet today"
- [x] #11 FlatList-in-ScrollView fixed
- [x] #12 Supplement tracker (model + UI)
- [x] #13 Notification bells wired
- [x] #14 AI chat persisted; history button → New Chat
- [x] #15 Real Weekly Breakdown chart
- [x] #16 Goal delete button

### Platform phases
- [x] **iOS notifications + badges** (`expo-notifications`)
- [x] **Phase 1a** — Supabase email/password auth
- [x] **Phase 2** — local-first cloud sync (tables, RLS, Storage, photo upload)
- [x] **Phase 3** — Gemini behind `gemini-proxy` Edge Function
- [x] **Multi-turn AI** — conversation history sent to Gemini
- [x] **Phase 4 build config** — `eas.json`, bundle id, privacy manifest

### Production hardening (code done — see docs/production-readiness.md)
- [x] In-app **account deletion** (Tier-1 blocker) — `delete-account` function + Profile UI
- [x] **Private** progress-photo bucket + signed URLs (was public)
- [x] AI **rate-limit** (60/user/day) + prompt cap + **medical disclaimer**
- [x] Legal links wired (Privacy / Terms / Support) — *update placeholder URLs*
- [x] **Sync-status UX** + local-cache clear on logout/delete
- [x] **Crash-reporting seam** (`src/lib/monitoring.ts`) — activate with `@sentry/react-native` + `SENTRY_DSN`
- [x] **Test suite** (`npm test`) — 17 tests (store, sync LWW decision, monitoring)
- [x] **NetInfo offline detection** — sync skips offline, retries on reconnect, shown in Profile
- [x] **Dark splash** — `userInterfaceStyle: dark` + dark splash background

### Polish & delight (see CHANGELOG.md for detail)
- [x] **Code-completeness audit** — rendered the missing Goal/Layout/Friends modals, wired "Change" buttons; every interactive element now does something real
- [x] **Motion + haptics** — FadeInView / PressableScale / AnimatedProgressBar primitives; FAB pulse, streak pop, animated bars, press springs, success/selection haptics
- [x] **Workability + fun** — tab-switch haptics, pull-to-refresh manual sync, "Goal crushed" celebration, LayoutAnimation list motion
- [x] **Phone testing docs** — README covers Expo Go + free-Apple-ID dev build (no TestFlight needed)
- [x] **Multi-turn AI memory** — AI coach sends conversation history (capped 20 turns) via `systemInstruction` + multi-turn `contents`
- [x] **Phase 4 build config (code)** — `eas.json`, iOS `bundleIdentifier` (placeholder) + `buildNumber`, `ios.privacyManifests`, App Store checklist doc

---

## ⏳ Pending (blocked on prerequisites)

- [ ] **Phase 1b — Apple + Google Sign-In**
  - Needs: a **Google iOS OAuth client ID**; Apple enrollment (for Apple Sign In).
  - App Store **requires** Apple Sign In when Google is offered.
  - Google buttons currently show a "coming soon" alert.
- [ ] **Phase 4 — EAS Build → TestFlight** *(gated on Apple Developer enrollment, in flight)*
  - [x] `eas.json` + EAS Build config (code)
  - [x] iOS `bundleIdentifier` (placeholder) + `buildNumber` in `app.config.js`
  - [x] Privacy manifest via `ios.privacyManifests` + App Store privacy-label checklist ([`docs/app-store-checklist.md`](docs/app-store-checklist.md))
  - [ ] Confirm real bundle identifier (replace `com.hustleon.app`)
  - [ ] `eas init` + fill Apple IDs in `eas.json`
  - [ ] Create App Store Connect app record
  - [ ] `eas build --platform ios` → `eas submit`

---

## ☐ Deferred / nice-to-have

- [ ] **#17 Integration OAuth** — Fitbit/Apple Health/Google Fit/Strava/MyFitnessPal are placeholder toggles; needs real provider OAuth.
- [ ] **Per-row sync / CRDT** — current sync is whole-account last-write-wins; revisit if real multi-device concurrent editing becomes a need.
- [ ] **Remote/server push notifications** — only local notifications today; remote push would need an APNs key.
- [ ] **Goal `currentValue` tracking** — goal progress bars only render when `currentValue` is set; nothing updates it yet.

---

## ⚠️ Known caveats

- **Sync = whole-account last-write-wins.** If two devices edit while both offline, the last one to sync overwrites the account. Acceptable for single-user; documented.
- **Email confirmation off in dev.** Re-enable before shipping.
