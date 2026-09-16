# HustleOn — TODO

Status tracker. ✅ = done in code, ⏳ = blocked/pending, ☐ = not started.
See [`README.md`](README.md) for setup and [`CLAUDE.md`](CLAUDE.md) for the full audit/architecture.

---

## ▶️ Next up (recommended sequence)

> **2026-09-15 audit correction.** This file previously implied the app was code-complete and
> blocked only on accounts/hosting. That was wrong on two counts, both now fixed:
> the project failed 4 `expo-doctor` checks and could not have produced a working native build,
> and a systemic UTC-vs-local date bug corrupted streaks, "today", the calendar and every
> Summary chart. See the new "Tier 0" section below for what was done, and the remaining
> **Tier 1** list for what still blocks a real release.

1. **Me:** Tier 1 correctness/privacy work — see the list below (onboarding-before-auth data loss,
   sync pagination, the decorative `cloudSync` / `shareDataWithAI` toggles, AI chat left on the
   device after sign-out).
2. **You:** run the Supabase manual steps below (2 migrations + 2 functions + secret).
3. **You:** host Privacy Policy + Terms pages and update the placeholder URLs in `ProfileScreen.tsx`.
4. **You, when Apple enrollment clears:** confirm the bundle id, run `eas init`, fill the Apple IDs
   in `eas.json`, then `eas build` → `eas submit`. See [`docs/app-store-checklist.md`](docs/app-store-checklist.md).
5. **You + me:** Phase 1b (Apple + Google sign-in) — needs a Google iOS OAuth client ID from you.

---

## ✅ Tier 0 — build blockers (done 2026-09-15)

The app could not have built or run correctly before these. All four `expo-doctor` failures are
resolved, `tsc --noEmit` is clean, `npm test` is **31/31**, and `expo export` bundles successfully.

> Note: `expo-doctor`'s "packages match versions required by installed Expo SDK" check is
> intermittent — it fails on roughly one run in three while its own payload reports
> `{"dependencies":[],"upToDate":true}` (i.e. no mismatches). It depends on a network lookup.
> `npx expo install --check` is the reliable signal and reports "Dependencies are up to date".

- [x] **Real app icon** — `assets/icon.png` was still the stock Expo placeholder (grey circles).
      Replaced with a brand mark; SVG sources kept at `assets/icon.svg` / `assets/icon-mark.svg`.
      Android `adaptiveIcon.backgroundColor` was `#ffffff`, which hid the white foreground.
- [x] **`expo-notifications` 0.29 → 0.32** (SDK 54 requirement; 0.29 predates the New Architecture).
      Also migrated the deprecated `shouldShowAlert` handler to `shouldShowBanner`/`shouldShowList`
      and dropped the `as any` casts hiding trigger types.
- [x] **Missing peer dep `expo-font`** — `@expo/vector-icons` needs it; without it the app crashes
      outside Expo Go.
- [x] **`expo-image-picker` config plugin was never registered** → `NSPhotoLibraryUsageDescription`
      absent from Info.plist → **iOS killed the app on the first photo pick**. Registered, with
      unused camera/microphone declarations explicitly disabled. Verified via `expo config --type introspect`.
- [x] **Duplicate native modules** deduped (`expo-constants`, `react-native-safe-area-context`;
      the latter needed an `overrides` entry because `react-native-calendars` pins 4.5.0 but never
      imports it).
- [x] **`app.json` deleted** — it shadowed `app.config.js` with contradictory values (`light` theme,
      white splash) and was silently ignored.
- [x] **Android `package` identifier added** (was absent; Android could not build or submit).
- [x] Deep-link `scheme: 'hustleon'` added (needed for auth redirects such as password reset).

## ✅ Date/timezone correctness (done 2026-09-15)

- [x] **New `src/utils/date.ts`** — `todayISO` / `toISODate` / `parseISODate` / `dayNumber` /
      `daysBetween` / `addDays`. All ~35 call sites migrated off `toISOString().split('T')[0]`
      and bare `new Date(dateString)`.
- [x] **`updateStreak` rewritten** on DST-proof day numbers (the old fixed-86,400,000ms step
      returned 1 instead of 3 across spring-forward — verified against the old implementation).
- [x] **Summary** no longer drops workouts logged on the 1st of the month, no longer attributes
      them to the wrong weekday, and dedupes same-day workouts in the best-streak count.
- [x] **`useToday()` hook** — "today" now rolls over at local midnight instead of being frozen at
      mount, and `workoutsThisWeek` anchors on today rather than the month the calendar is scrolled to.
- [x] **Date of birth** no longer stored a day early.
- [x] **Tests**: `TZ` pinned to `America/New_York` in `jest.setup.js`; new `date.test.ts` plus
      streak regressions (31 tests total, up from 17 — one of which was failing).

---

## 🔴 Tier 1 — still blocking a real release

- [ ] **Onboarding runs before auth → signing into an existing account wipes its cloud data.**
      Onboarding writes the profile and bumps `dataUpdatedAt`; login then sees local-newer and
      pushes, and `push()` deletes remote rows not present locally.
- [ ] **Sync has no pagination** — Supabase caps `select()` at 1000 rows; past ~1000 meals the pull
      truncates and the next push deletes the remainder server-side.
- [ ] **`cloudSync` and `shareDataWithAI` toggles do nothing.** `cloudSync` even defaults to *off*
      while all health data, photos and profile upload regardless. Only `analytics` is enforced.
- [ ] **AI chat history survives sign-out** (`@hustleon:ai_chat` is cleared only on account delete)
      — next user on a shared device reads the previous user's health conversation.
- [ ] **Integrations openly say "placeholder" / "(demo mode)"** in the UI — App Store guideline 2.1.
      Remove or disable before submitting.
- [ ] **Password reset is a dead end** — `resetPasswordForEmail` passes no `redirectTo`
      (the `scheme` is now configured, so this is wireable).
- [ ] `removeProgressPhoto` never deletes the storage object; `delete-account` lists only the first
      100 files.
- [ ] `increment_ai_usage` is `SECURITY DEFINER` with no `REVOKE` — any user can burn another
      user's daily AI quota.
- [ ] Zero accessibility labels across ~227 interactive elements.
- [ ] Android notifications unimplemented (no permission request, no channel).

---

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
