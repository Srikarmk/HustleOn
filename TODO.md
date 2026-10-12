# HustleOn — TODO

Status tracker. ✅ = done in code, ⏳ = blocked/pending, ☐ = not started.
See [`HANDOFF.md`](HANDOFF.md) to pick the project up cold, [`README.md`](README.md) for setup,
and [`CLAUDE.md`](CLAUDE.md) for the architecture and conventions.

---

## ▶️ Next up (recommended sequence)

Tier 0 (build blockers) and Tier 1 (data-loss / privacy / App Store) are **done**.
What's left is almost entirely your accounts, hosting and decisions.

1. **You:** run the Supabase manual steps below — 3 migrations, 2 functions, 1 secret,
   and the auth redirect URL.
2. **You:** host Privacy Policy + Terms and replace the placeholder URLs in `ProfileScreen.tsx`.
3. **You, when Apple enrollment clears:** confirm the bundle id, `eas init`, fill the Apple IDs
   in `eas.json`, then `eas build` → `eas submit`. See [`docs/app-store-checklist.md`](docs/app-store-checklist.md).
4. **You + me:** Phase 1b (Apple + Google sign-in) — needs a Google iOS OAuth client ID.
   Apple Sign In is *required* while a Google button is shown, so both land together.

---

## ✅ Tier 0 — build blockers (done 2026-09-15)

The app could not have built or run correctly before these.

Verified on `main`: `expo-doctor` **18/18**, `expo install --check` up to date, `tsc --noEmit`
clean, `npm test` **31/31**, `expo export` bundles for **both** platforms, and
`expo prebuild --platform ios` generates a correct native project
(`NSPhotoLibraryUsageDescription` present, camera/mic absent, bundle id `com.hustleon.app`,
`hustleon` URL scheme, dark UI style, `PrivacyInfo.xcprivacy`, and a 1024px **alpha-free**
App Store icon).

- [x] **dotenv was corrupting tooling output** — it prints a promo banner to stdout, which was
      prepended to the JSON from `expo install --check --json`, so `expo-doctor`'s dependency
      check failed to `JSON.parse` and reported a failure on every run despite zero mismatches.
      Fixed with `quiet: true`. (`/ios` and `/android` are now gitignored as CNG output.)

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

## ✅ Tier 1 — data-loss, privacy & App Store (done 2026-09-16)

- [x] **Onboarding no longer runs before auth.** Split into `IntroNavigator` (Welcome/Features,
      writes nothing, pre-auth) and `ProfileSetupNavigator` (UserInfo/GetStarted, post-auth).
      Profile setup used to bump the sync clock while signed out, so logging into an existing
      account looked "local newer" and `push()` deleted every remote row — wiping the account's
      cloud data on any reinstall-then-login. `App.tsx` now loads + syncs *before* deciding
      whether setup is needed, so an existing user on a new device never re-onboards.
- [x] **Onboarding flag is per user.** Was one device-global key, so a second account on the
      same device skipped setup and ended up with no profile. The old key is migrated.
- [x] **Sync is paged.** PostgREST caps responses at 1000 rows; past ~1000 meals the pull
      truncated and the next push *deleted the remainder server-side*. Reads, the delete
      reconcile and storage listing all page now; upserts and deletes are chunked.
- [x] **`cloudSync` is enforced** in `sync.ts` — the switch was in the UI but never read, so
      everything uploaded regardless of its position. Default is now ON, with a one-time
      settings migration (`PRIVACY_SETTINGS_VERSION`) so users whose stored `false` was a dead
      default keep their cloud backup.
- [x] **`shareDataWithAI` is enforced** in `gemini.ts` via `{ includesUserData: true }`. The
      three advice calls that embed weight/BMI/meals are gated; the AI chat and the food lookup
      are not, because the user types those themselves.
- [x] **Dropped `aiDataUsage`** — never rendered, duplicated `shareDataWithAI`'s meaning.
- [x] **Sign-out hygiene.** `clearLocalData()` now also clears the AI chat history (health
      details, previously wiped only on account deletion) plus notification/privacy/theme
      settings, which used to carry from one user to the next on a shared device.
- [x] **Integrations are honest.** The 5 rows no longer fake a connected state or tell the user
      they're a placeholder; they render disabled with a "Coming soon" label (guideline 2.1).
- [x] **Password reset works end to end.** `resetPasswordForEmail` sends a `hustleon://`
      redirect, `AuthContext` handles the incoming deep link and establishes the recovery
      session, and a new `ResetPasswordScreen` takes over the app until the user sets a new
      password or cancels. Signup's minimum length raised 6 → 8 to match.
- [x] **Orphaned photos are collected.** `sync.ts` reconciles bucket contents against
      referenced paths on every push (so offline deletes are cleaned up too), and
      `delete-account` pages past the 100-object `list` default.
- [x] **`increment_ai_usage` locked down** — migration `0003`. It was `SECURITY DEFINER` with
      the default PUBLIC execute grant, so any signed-in user could burn another account's daily
      AI quota. EXECUTE revoked, and it now meters `auth.uid()` when called with a JWT.
- [x] **Accessibility.** All 34 icon-only controls carry `accessibilityLabel` /
      `accessibilityRole` (the supplement toggle is a real checkbox with state; the FAB is
      labelled). Profile's dead notification bell — a button with no `onPress` — is now a plain
      icon. *(The earlier "227 unlabelled elements" figure was wrong: it counted text buttons,
      which already announce via their child `Text`. The real gap was 34.)*
- [x] **Android notifications implemented** — notification channel + runtime permission
      (nothing displayed before), and `meal_reminder` now honours its configured days instead
      of firing daily.
- [x] **Errors reach the monitoring seam.** 23 `console.error` sites now route through
      `captureError`, so a Sentry DSN will actually receive them.
- [x] **Tests: 31 → 48.** New coverage for the privacy migration, the `cloudSync` and
      `shareDataWithAI` gates, sign-out hygiene, and auth deep-link parsing.

## ☐ Remaining code item

- [ ] **Crash reporting is inert.** `src/lib/monitoring.ts` is wired app-wide and every error
      path now flows through it, but `@sentry/react-native` is deliberately *not* installed —
      it adds a native dependency that does nothing without a DSN. To activate:
      `npm i @sentry/react-native`, add its Expo plugin to `app.config.js`, set `SENTRY_DSN`,
      then build a dev client.

---

Full ship checklist: [`docs/production-readiness.md`](docs/production-readiness.md).

---

## 🚨 Manual steps required (you must do these — code is ready)

- [ ] **Run the SQL migrations** — `0001_init.sql`, then `0002_production.sql`, then `0003_harden_ai_usage.sql` in the Supabase SQL Editor. *Without 0001, cloud sync fails silently; 0002 makes photos private + adds AI rate-limiting; 0003 stops one user burning another's AI quota.*
- [ ] **Add the auth redirect URL** — Supabase → Authentication → URL Configuration → Redirect URLs: add `hustleon://reset-password`. *Password reset emails are ignored without it.*
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
