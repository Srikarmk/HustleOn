# Changelog

All notable changes to the HustleOn app are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## 2026-07-14 — Workability + fun

### Added
- **Pull-to-refresh = manual cloud sync** on Workout, Calories, and Summary (`useSyncRefresh` hook + `RefreshControl`, light haptic on pull).
- **Tab-switch haptic** – subtle selection tick on every bottom-tab press.
- **Goal celebration** – Weekly Goal card flips to "🎉 Goal crushed this week" when the target is hit.
- **List motion** – meal delete and supplement add/remove ease into place via `LayoutAnimation` instead of snapping.
- **README: iPhone testing without TestFlight** – Expo Go path and free-Apple-ID dev build (`npx expo run:ios --device`, 7-day signature).

## 2026-07-11 — Motion & haptics, code-completeness audit, prod polish

### Added
- **Animation primitives** (built-in `Animated` API, New-Arch safe): `FadeInView` (fade + rise entrance), `PressableScale` (spring press + light haptic), `AnimatedProgressBar` (eased fill width), `haptics` util (`expo-haptics`, crash-proof).
- **Motion wired in**: FAB pop-in + idle pulse + press spring; Workout "I worked out today" spring + success haptic, animated weekly bar, streak number pops on change; Calorie animated daily bar + tactile Add Meal + success haptic on log; BMI tactile Calculate + result fade-in.
- **Crash-reporting seam** – `src/lib/monitoring.ts` (`captureError`/`captureMessage`): lazy-loads `@sentry/react-native` only when `SENTRY_DSN` is set (console fallback otherwise), gated on the Analytics privacy toggle; wired into app init, sync, and the Gemini client.
- **Test suite** – `jest-expo` (`npm test`): 17 tests across store (streak grace-day/dedupe, supplements, meals, goals, `clearLocalData`, `applyRemoteState` clock), sync last-write-wins decision (incl. `Z` vs `+00:00` formats), monitoring fallback.
- **Offline detection** – NetInfo: sync skips + shows "offline" when disconnected, auto-retries on reconnect; Profile shows sync state.

### Changed
- **Dark splash** – `userInterfaceStyle: 'dark'` + `#1e1e2e` splash background (was white flash).
- Extracted pure `decideSyncDirection()` from `syncNow` for testability.

### Fixed (code-completeness audit)
- Profile's **Add/Edit Goal, Layout Style, and Add Friend modals** were triggered but never rendered — all three now exist and work.
- **"Change"** links on the Weekly/Daily goal cards had no handler — now navigate to Profile.

### Production hardening
- **In-app account deletion** (App Store 5.1.1(v)) – `delete-account` Edge Function (service role wipes rows + storage + auth user) + double-confirm Profile UI; `clearLocalData()` clears the device cache on logout/delete.
- **Private progress-photo bucket** – migration `0002_production.sql`; sync stores object paths and mints 7-day signed URLs, refreshed each sync (photos were publicly reachable before).
- **AI cost guard** – `gemini-proxy` rate limit (60 calls/user/day via `ai_usage` + atomic RPC) and 8k-char prompt cap; **"not medical advice" disclaimer** on all AI surfaces.
- **Legal links** (Privacy/Terms/Support) wired via `Linking` (placeholder URLs to swap before ship); **sync-status row** in Profile (syncing / last synced / failed / offline).

## 2026-06-18/19 — Backend phases (Supabase) + parallel-session merge

### Added
- **Phase 1a: real auth** – Supabase email/password; `AuthProvider` session manager (persist + auto-refresh, `onAuthStateChange`); Login/Signup wired with loading/error states; working Forgot Password; Google button deferred to Phase 1b ("coming soon").
- **Phase 2: local-first cloud sync** – per-type Postgres tables + RLS (`0001_init.sql`), `progress-photos` Storage bucket, `src/lib/sync.ts` whole-account last-write-wins driven by a `dataUpdatedAt` clock; syncs on launch/foreground and debounced after edits.
- **Phase 3: secure Gemini** – `gemini-proxy` Edge Function holds `GEMINI_API_KEY` as a server secret and verifies JWTs; key removed from the app bundle.
- **Multi-turn AI coach** – conversation history (last 20 turns) sent to Gemini; chat persisted across restarts.
- **iOS notifications + badges** – `expo-notifications`: scheduled reminders from preferences, badge = current streak.
- **Phase 4 build prep** – `eas.json`, bundle-id placeholder, privacy manifest, `docs/app-store-checklist.md`.
- **Docs** – `README.md`, `TODO.md`, `supabase/README.md`, `docs/production-readiness.md`, `CLAUDE.md` audit reference.
- *(Parallel session, merged)* **Theme typography** (`FONTS` + expanded `SIZES`), **supplement tracker** (merged with the `takenDates` model + default seeds), **sample trends** when no data exists.

### Fixed (2026-06-04 audit, 18 findings)
- Profile edits never persisted (`saveProfile` no-op, dead Save button); logout required app restart; `loadData()` fired 6+ times on startup; duplicate StyleSheet keys; body-fat calc assumed male; hard-coded 70 kg goal in trajectory; streak reset if not yet worked out today; FlatList-in-ScrollView; dead notification bells; stub supplement tracker; "coming soon" chat history; static Weekly Breakdown; missing goal delete; Gemini key shipped in bundle (closed by Phase 3).

---

## 2026-02-09 (earlier session)

### Added
- **Theme typography and spacing** – `FONTS` and expanded `SIZES` in `src/constants/theme.ts` (display, h1–h3, body, bodySmall, caption, overline; bold/semibold/medium/regular; xs–xxl spacing; iconSm/iconMd/iconLg).
- **Consistent font/size usage** – WorkoutTrackerScreen, SummaryScreen, CalorieTrackerScreen, and ProfileScreen now use `FONTS` and `SIZES` from the theme for headings, body text, spacing, and icons.

### Changed
- **iOS dev script** – `npm run ios` now runs with `--localhost` so the simulator connects to Metro at `127.0.0.1:8081` and avoids "network connection was lost" on LAN.
- **Border radius and card padding** – `SIZES.borderRadius` set to 12, `SIZES.cardPadding` to 18.

### Fixed
- **iOS simulator not opening** – Clarified that `npm run start` only starts Metro; use `npm run ios` (or press `i` after start) to open the iOS simulator.
- **iOS "network connection was lost"** – Fixed by using `expo start --ios --localhost` so the app connects via localhost.

---

## 2026-02-09 (header revert)

### Changed
- **Workout header** – Restored "Gym Tracker" title and "Build your fitness habit" subtitle (reverted the earlier "Hustle On" / no-subtitle change).

---

*Entries above "Unreleased" are grouped by session; new changes will be added under [Unreleased].*
