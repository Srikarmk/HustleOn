# HustleOn — TODO

Status tracker. ✅ = done in code, ⏳ = blocked/pending, ☐ = not started.
See [`README.md`](README.md) for setup and [`CLAUDE.md`](CLAUDE.md) for the full audit/architecture.

---

## ▶️ Next up (recommended sequence)

1. **You:** run the 3 Supabase manual steps below → unlocks live end-to-end verification of Phases 1–3.
2. **You, when Apple enrollment clears:** confirm the bundle id, run `eas init`, fill the Apple IDs in `eas.json`, then `eas build` → `eas submit`. See [`docs/app-store-checklist.md`](docs/app-store-checklist.md).
3. **You + me, when ready:** Phase 1b (Apple + Google sign-in) — needs a Google iOS OAuth client ID from you.

---

## 🚨 Manual steps required (you must do these — code is ready)

- [ ] **Run the SQL migration** — `supabase/migrations/0001_init.sql` in the Supabase SQL Editor (creates tables, RLS, Storage bucket). *Without this, cloud sync fails silently.*
- [ ] **Deploy the Edge Function** — `supabase functions deploy gemini-proxy`. *Without this, AI features error.*
- [ ] **Set the Gemini secret** — `supabase secrets set GEMINI_API_KEY=AIza...`
- [ ] *(dev)* Disable email confirmation in Supabase Auth so signup logs in immediately.

See [`supabase/README.md`](supabase/README.md) for exact commands.

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
