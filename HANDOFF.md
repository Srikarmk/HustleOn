# HustleOn — Handoff

**Read this first if you're picking the project up on a new machine (human or agent).**

Last verified: **2026-10-12** on `main` @ `3f6f776`, pushed to
`github.com/Srikarmk/HustleOn`.

| Check | Command | Expected |
|---|---|---|
| Types | `npx tsc --noEmit` | 0 errors |
| Tests | `npm test` | **48 passed** |
| Toolchain | `npx expo-doctor` | **18/18** |
| Deps | `npx expo install --check` | "Dependencies are up to date" |
| Bundle | `npx expo export --platform ios` | bundles |
| Native | `npx expo prebuild --platform ios --no-install --clean` | generates `ios/`, then **delete it** (gitignored) |

If any of those fail on a fresh clone, fix that before writing features — the
repo was green when it was handed over.

---

## 1. Set up a new machine

```bash
git clone https://github.com/Srikarmk/HustleOn.git
cd HustleOn
npm install
npm start          # or: npm run ios
```

`.env` is **optional and gitignored**. It only overrides `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SENTRY_DSN`. The Supabase URL + anon key are already
baked into `app.config.js` as defaults (they're public values; RLS protects the
data). **The Gemini key is not needed locally** — it lives as a Supabase Edge
Function secret and must never enter the bundle.

What you can't get from the repo: the Supabase dashboard login, the Apple
Developer account, and the Gemini API key. Those are the user's.

---

## 2. Where the project stands

A functional, buildable app. Not released.

- **Done:** Tier 0 (build blockers) and Tier 1 (data-loss, privacy, App Store
  blockers). Full detail in [`TODO.md`](TODO.md); narrative history in
  [`CHANGELOG.md`](CHANGELOG.md).
- **Architecture + conventions:** [`CLAUDE.md`](CLAUDE.md). Read it before
  changing anything — several rules there exist because the opposite shipped and
  broke.
- **Ship checklist:** [`docs/production-readiness.md`](docs/production-readiness.md)
  and [`docs/app-store-checklist.md`](docs/app-store-checklist.md).

Feature inventory is in `CHANGELOG.md` / `TODO.md`; briefly, the app covers
workout logging + streaks, calorie and macro tracking with AI food analysis,
BMI / body composition / measurements / progress photos, a monthly summary with
charts, a multi-turn AI coach, goals, notifications, and local-first cloud sync.

---

## 3. What's left — BLOCKED ON THE USER

**Nothing in this section can be done by an agent.** These need accounts,
hosting, or money. They are the critical path to release.

### Supabase (do these first — several features are inert without them)
1. Run the migrations in the SQL Editor, **in order**:
   `supabase/migrations/0001_init.sql` → `0002_production.sql` → `0003_harden_ai_usage.sql`
   - Without `0001`, cloud sync fails silently.
   - `0002` makes the photo bucket private + adds AI rate limiting.
   - `0003` stops one user burning another's AI quota.
2. Deploy the Edge Functions:
   `supabase functions deploy gemini-proxy` and `supabase functions deploy delete-account`
3. `supabase secrets set GEMINI_API_KEY=...` — **all AI features fail without this.**
4. Authentication → URL Configuration → Redirect URLs: add `hustleon://reset-password`
   — **password reset emails are ignored without it.**
5. Configure SMTP + email templates, and re-enable email confirmation (it was
   turned off for dev convenience).
6. For production: a separate Supabase project, and Pro tier (free tier pauses on
   inactivity and has no backups).

### Legal / App Store
7. Host a Privacy Policy and Terms page, then replace the placeholders at the top
   of `src/screens/Profile/ProfileScreen.tsx` (`PRIVACY_URL`, `TERMS_URL`,
   `SUPPORT_EMAIL` — currently `hustleon.app` which isn't live).
8. Fill in App Privacy labels in App Store Connect. The app collects email,
   health/fitness data and photos. Note `ios.privacyManifests.NSPrivacyCollectedDataTypes`
   in `app.config.js` is still `[]` — **that contradicts reality and should be
   filled in before submitting.**
9. Screenshots (6.7" / 6.5", plus iPad since `supportsTablet: true` — or set it
   false), description, keywords, age rating, category.

### Build
10. Confirm the bundle identifier. `com.hustleon.app` is a placeholder in
    `app.config.js` and `eas.json` and is **permanent once registered**.
11. `eas init`, then fill the three `REPLACE_WITH_...` fields in `eas.json`.
12. Create the App Store Connect record → `eas build --platform ios` → `eas submit`.

---

## 4. What's left — CODE (an agent can do these)

Roughly highest value first.

1. **Phase 1b — Apple + Google Sign-In.** Needs a Google iOS OAuth client ID from
   the user and Apple enrollment. **Apple Sign In is mandatory while a Google
   button is shown**, so they ship together. Today both Google buttons show a
   "Coming Soon" alert (`LoginScreen.tsx`, `SignupScreen.tsx`) — if 1b is deferred
   past submission, *remove the buttons* rather than ship a dead control.
2. **Activate Sentry.** The seam is complete and all 23 error paths route through
   `captureError`, but `@sentry/react-native` is deliberately not installed — it's
   a native dep that does nothing without a DSN. To finish:
   `npm i @sentry/react-native`, add its Expo plugin to `app.config.js`, set
   `SENTRY_DSN`, build a dev client.
3. **Goal `currentValue` is never updated.** Goal progress bars only render when
   it's set, and nothing sets it. Either wire it to real data (weight goals →
   latest BMI record; workout goals → counts) or hide the bars.
4. **Integrations** (Fitbit / Apple Health / Google Fit / Strava / MyFitnessPal)
   render as disabled "Coming soon". Real provider OAuth is a sizeable project;
   Apple Health (HealthKit) is the most valuable and the only one that doesn't
   need a server.
5. **Summary shows sample data for new users.** Labelled "sample", but a real
   empty state would be better.
6. **Sync is whole-account last-write-wins.** Fine for one device; if the user
   starts using two, the last to sync wins the whole account. Per-row/CRDT is the
   fix. See the caveat in `CLAUDE.md`.
7. **Remote push notifications** — local only today; would need an APNs key.
8. **Widen tests.** 48 now. Sync IO (push/pull/pagination against a mocked
   Supabase) and the auth flows are the biggest gaps.

---

## 5. Needs real-device testing (verified statically only)

Everything below typechecks, bundles and is unit-tested, but has **not** been
exercised on a device or simulator. Test these first on the new machine:

- **Password reset end to end** — email → `hustleon://reset-password` deep link →
  `ResetPasswordScreen`. Needs Supabase step 4 above. Highest risk item here.
- **Photo upload.** `sync.ts: uploadPhoto` uses `fetch(file://…).arrayBuffer()`,
  which is known to be unreliable on React Native. If progress photos don't
  reach the bucket, switch to `FileSystem.readAsStringAsync` + base64 decode.
- **Notifications** on both platforms (iOS badge/streak, the new Android channel).
- **Multi-turn AI chat.** The history sent to Gemini starts with the canned
  welcome message as a `model` turn. Gemini usually tolerates a leading model
  turn, but if the proxy returns 400s about alternating roles, drop that first
  message from the history.
- **Account deletion** and **data export** (both touch real files/records).

---

## 6. Traps — read before editing

These are the ones that already caused bugs. `CLAUDE.md` has the full set.

- **Dates.** Never `new Date().toISOString().split('T')[0]` (that's the *UTC*
  day) and never `new Date(dateOnlyString)` (parses as UTC midnight → reads back
  a day early). Always use `src/utils/date.ts`. Tests pin
  `TZ=America/New_York` so this class of bug actually fails.
- **Privacy toggles are contracts.** Every switch in Profile → Privacy must be
  enforced somewhere: `cloudSync` in `sync.ts`, `shareDataWithAI` in `gemini.ts`,
  `analytics` in `monitoring.ts`. Two of them shipped as pure decoration. Adding a
  toggle means adding its enforcement point *and* a test in the same change.
  Changing a persisted default needs `PRIVACY_SETTINGS_VERSION` bumped and a
  branch in `migratePrivacySettings`.
- **Sync must page.** PostgREST caps responses at 1000 rows. A truncated read
  previously caused `push()` to delete every row it never saw. Use
  `selectAllRows`.
- **Onboarding straddles auth on purpose.** Marketing screens before sign-in,
  profile-writing screens after. Moving profile setup back before auth
  re-introduces a bug that wipes the user's cloud data on reinstall-then-login.
- **`loadData()` is called once, in `App.tsx`.** Don't add it to screens; it can
  clobber freshly-synced state.
- **`app.json` must not come back.** It silently shadowed `app.config.js`.
  `app.config.js` is the single source of truth.
- **`dotenv` needs `quiet: true`** in `app.config.js`. Without it, its banner
  goes to stdout and corrupts the JSON that `expo-doctor` parses.
- **`/ios` and `/android` are gitignored.** This is a managed (CNG) project —
  they're generated by `expo prebuild` and must never be committed.

---

## 7. Decisions already made — don't re-litigate

- **Cloud Sync defaults ON** and the toggle is enforced, with a one-time
  migration so existing users keep their backup. (User's call, 2026-09-16.)
- **Integrations render as disabled "Coming soon"** rather than being removed.
  (User's call, same date.)
- **Sentry intentionally not installed** until a DSN exists.
- **Camera/microphone permissions are deliberately disabled** in the
  `expo-image-picker` plugin config — the app only ever calls
  `launchImageLibraryAsync`, and declaring unused permissions invites App Review
  questions. Re-enable if in-app capture is added.
- **Password minimum is 8** in both signup and reset.

---

## 8. Git / working style

- Remote: `https://github.com/Srikarmk/HustleOn.git`, default branch `main`.
- The user commits **as themselves** — do not add `Co-Authored-By: Claude`
  attribution lines to commits or PRs.
- Work happened on a worktree branch and was fast-forwarded into `main`. Keep
  `main` green: typecheck + tests + `expo-doctor` before merging.
- `AGENTS.md` is a symlink to `CLAUDE.md` so both agent conventions read the same
  instructions and can't drift.
