# HustleOn — Codebase Audit

## Project Overview

HustleOn is a React Native fitness tracking app built with Expo. It covers workout logging, calorie tracking, BMI/body tracking, monthly summaries, and an AI coach powered by Google Gemini 2.5 Flash.

**Current state:** Functional dummy app — no real auth backend, AI features require a user-supplied Gemini key, data persisted locally on-device only.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| Framework | React Native `0.81.5` + Expo `~54.0.30` |
| Language | TypeScript `~5.9.2` |
| Navigation | `@react-navigation/native` v7, bottom-tabs, native-stack, stack |
| State | Zustand `^4.5.7` |
| Persistence | `@react-native-async-storage/async-storage` |
| AI | Google Gemini 2.5 Flash REST API |
| Calendar | `react-native-calendars` |
| Media | `expo-image-picker`, `expo-file-system`, `expo-sharing` |
| UI | `@expo/vector-icons` (Ionicons), `expo-linear-gradient` (installed, unused) |

---

## Directory Structure

```
/
├── App.tsx                        # Root — navigation phase controller
├── index.ts                       # Expo entry point
├── app.config.js                  # Expo config, loads .env, injects GEMINI_API_KEY
├── app.json
├── babel.config.js
├── tsconfig.json
├── env.example                    # Copy to .env, add GEMINI_API_KEY
├── assets/                        # icon, splash, favicon, adaptive-icon
└── src/
    ├── config/
    │   └── gemini.ts              # Gemini REST helper, system prompts
    ├── constants/
    │   └── theme.ts               # COLORS and SIZES
    ├── navigation/
    │   ├── OnboardingNavigator.tsx
    │   ├── AuthNavigator.tsx
    │   └── MainNavigator.tsx      # Tab navigator + root stack (AI chat modal)
    ├── components/
    │   └── FloatingAIButton.tsx   # FAB that navigates to AIChat modal
    ├── store/
    │   └── index.ts               # Zustand store — all app state + AsyncStorage I/O
    ├── types/
    │   └── index.ts               # All TypeScript interfaces + nav param lists
    ├── utils/
    │   └── storage.ts             # Onboarding + auth status (separate from store)
    └── screens/
        ├── Onboarding/
        │   ├── WelcomeScreen.tsx
        │   ├── FeaturesScreen.tsx
        │   ├── UserInfoScreen.tsx  # Collects name, DOB, measurements, goals, diet
        │   └── GetStartedScreen.tsx
        ├── Auth/
        │   ├── LoginScreen.tsx
        │   └── SignupScreen.tsx
        ├── Workout/
        │   └── WorkoutTrackerScreen.tsx
        ├── Calorie/
        │   └── CalorieTrackerScreen.tsx
        ├── BMI/
        │   └── BMICalculatorScreen.tsx
        ├── Summary/
        │   └── SummaryScreen.tsx
        ├── Profile/
        │   └── ProfileScreen.tsx
        └── AI/
            └── AIChatScreen.tsx
```

---

## App Flow

```
App launch
  └─ checkAppStatus() reads AsyncStorage
       ├─ !onboardingCompleted → OnboardingNavigator
       │     Welcome → Features → UserInfo → GetStarted → sets onboardingCompleted=true
       ├─ !isAuthenticated → AuthNavigator
       │     Login ↔ Signup → sets isAuthenticated=true
       └─ MainNavigatorWithStack
             MainTabs (bottom nav)
               Tracker | Calories | BMI | Summary | Profile
             + AIChat (modal, triggered by FloatingAIButton on every tab)
```

Storage layers:
- **Auth/session** → Supabase (`src/lib/supabase.ts`), session persisted in AsyncStorage by supabase-js
- `src/utils/storage.ts` — onboarding flag only (`@hustleon:onboarding_completed`)
- `src/store/index.ts` — all fitness data (`@hustleon:app_data`), the local source of truth
- **Cloud sync** → Supabase Postgres + Storage (`src/lib/sync.ts`); local store mirrors to per-type tables, whole-account last-write-wins

Navigation phase in `App.tsx`: `OnboardingNavigator` (if not onboarded) → `AuthNavigator` (if no Supabase session) → `MainNavigatorWithStack`.

---

## Data Model (src/types/index.ts)

| Type | Key fields |
|------|-----------|
| `Workout` | id, date, exercises[], notes |
| `Exercise` | name, sets, reps, weight |
| `Meal` | id, date, time, name, calories, protein, carbs, fats |
| `BMIRecord` | id, date, weight, height, bmi, unit, bodyFatPercent, muscleMass, waistCircumference |
| `BodyMeasurement` | id, date, chest/waist/hips/arms/thighs, unit |
| `ProgressPhoto` | id, date, uri, thumbnail |
| `UserProfile` | name, age, dateOfBirth, weight, height, unit, dietaryPreference, profilePictureUri |
| `Goal` | id, type, title, targetValue, currentValue, unit, targetDate |
| `Integration` | id, name (fitbit/apple_health/google_fit/strava/myfitnesspal), connected, lastSync |
| `NotificationPreference` | type, enabled, time, days |
| `PrivacySettings` | aiDataUsage, cloudSync, analytics, shareDataWithAI |
| `ThemeSettings` | darkMode, accentColor, layout |
| `Friend` | id, name, avatar, connectedAt |

---

## AI Integration (src/config/gemini.ts)

- Model: `gemini-2.5-flash`, called **through the Supabase Edge Function `gemini-proxy`** (Phase 3) — the API key is a server-side secret, never in the app bundle.
- Client: `generateGeminiResponse(prompt, systemPrompt)` → `supabase.functions.invoke('gemini-proxy', { body })`. The user's JWT is attached automatically; the function verifies it before calling Gemini.
- Edge Function: `supabase/functions/gemini-proxy/index.ts` (Deno). Reads `GEMINI_API_KEY` from `Deno.env`. Deploy with `supabase functions deploy gemini-proxy`; set the secret with `supabase secrets set GEMINI_API_KEY=...`.
- Used in: CalorieTracker (food analysis + nutrition advice), BMICalculator (health advice), Summary (monthly insights), AIChatScreen (free-form coach)
- System prompt `FITNESS_COACH_PROMPT` shared across screens

---

## Bugs & Issues

### Critical — FIXED

**1. `NotificationPreference` not imported in ProfileScreen** ✅
Fixed: `NotificationPreference` now imported from `../../types`.

**2. `saveProfile()` is a no-op — profile edits are never persisted** ✅
Fixed: `saveProfile()` now calls `store.setUserProfile()` with all profile fields. `updateProfile()` no longer auto-calls `saveProfile()` on every keystroke — user must tap "Save Changes".

**3. Logout doesn't update in-memory auth state** ✅
Fixed: `AuthContext` (`src/context/AuthContext.tsx`) exposes a `logout()` callback provided by `App.tsx`. `App.tsx`'s `handleLogout` calls `storage.logout()`, `cancelAllNotifications()`, and resets both state booleans — app navigates back to login screen immediately.

### High — FIXED

**4. `loadData()` called 6+ times on startup** ✅
Fixed: `loadData()` is called once in `App.tsx`'s `checkAppStatus()` (awaited before `setIsLoading(false)`), and in `handleLogin`/`handleSignup` before setting auth state. Removed from `MainNavigatorWithStack`, `MainNavigator`, `WorkoutTrackerScreen`, `CalorieTrackerScreen`, `BMICalculatorScreen`, `SummaryScreen`.

**5. Duplicate `StyleSheet` keys in ProfileScreen cause silent dead code** ✅
Fixed: Removed the first definitions of `modalOverlay`, `modalContent`, `modalTitle` (~lines 1174–1195 in the original). The kept `modalTitle` now includes the `marginBottom: 20, textAlign: 'center'` that was being silently overridden.

**6. Gemini API key ships in the compiled app bundle** ✅ (Phase 3)
Fixed: the key is gone from `app.config.js`/the bundle. AI calls now route through the Supabase Edge Function `gemini-proxy`, which holds `GEMINI_API_KEY` as a server secret and verifies the caller's JWT. Client (`src/config/gemini.ts`) uses `supabase.functions.invoke`.

### Real iOS Notifications + Badges — ADDED

New files:
- `src/context/AuthContext.tsx` — auth context for logout propagation
- `src/utils/notifications.ts` — `requestNotificationPermissions`, `scheduleAllNotifications`, `updateBadgeCount`, `cancelAllNotifications`

`app.config.js` updated with `expo-notifications` plugin and iOS `NSUserNotificationsUsageDescription`.

`App.tsx` schedules notifications once data is loaded and updates the iOS badge count whenever `currentStreak` changes. ProfileScreen notification toggles now re-schedule in real time.

### Medium

**7. `expo-linear-gradient` installed but never imported or used** ✅
Fixed: removed from `package.json`. The `*Gradient`-named views remain plain `backgroundColor` `View`s (no behavior change).

**8. Body fat calculation assumes male** ✅
Fixed: added `gender` to `UserProfile`; `BMICalculatorScreen` now uses the user's real age + gender in the Deurenberg formula. Gender selectors added to onboarding (`UserInfoScreen`) and `ProfileScreen`. (The unused Navy-method `calculateBodyFat` needs a neck measurement we don't collect, so the Deurenberg estimate is used instead.)

**9. `predictTrajectory` hard-codes 70 kg goal weight** ✅
Fixed: `BMICalculatorScreen` now reads the user's weight-type `Goal` from the store; prediction only renders when such a goal exists.

**10. Streak resets to 0 if user hasn't logged a workout yet today** ✅
Fixed: `store/index.ts:updateStreak` rewritten to dedupe by day and allow a one-day grace (streak stays alive if the last workout was today *or* yesterday).

**11. `FlatList` nested in `ScrollView` (progress photos)** ✅
Fixed: added `nestedScrollEnabled` to the horizontal `FlatList` in `BMICalculatorScreen`. Also fixed two in-place `.sort()` calls that mutated the Zustand store array (now copy first).

Also fixed (not in original audit): `exportData` used `FileSystem.documentDirectory`, removed from `expo-file-system` v19's main entry — switched to `expo-file-system/legacy`, restoring the GDPR export feature.

### Low / Stub UI

**12. Supplement Tracker is entirely a stub** ✅
Fixed: added a `Supplement` type + store actions (`addSupplement`, `removeSupplement`, `toggleSupplementTaken`, persisted in `saveData`/`loadData`). `WorkoutTrackerScreen` now has an Add-Supplement modal, lists supplements with a "taken today" check toggle, and a delete action.

**13. Notification bell buttons in all screen headers do nothing** ✅
Fixed: the bells in WorkoutTracker, CalorieTracker, BMICalculator, and Summary now navigate to the Profile tab (notification settings). Profile's own bell is already on that screen, so it has no separate destination.

**14. AI chat history button is a "coming soon" alert** ✅
Fixed: `AIChatScreen` now persists the conversation to AsyncStorage (`@hustleon:ai_chat`) so it survives restarts; the header button (now a compose icon) starts a New Chat with a confirm. (Multi-turn context still isn't sent to Gemini — that's the larger AI-centerpiece work, deferred.)

**15. "Weekly Breakdown" card is a static placeholder** ✅
Fixed: `SummaryScreen` now buckets the month's workouts into weeks (1–7, 8–14, …) and renders real per-week bars.

**16. Goal cards in Profile have no delete button** ✅
Fixed: each custom goal card now has a trash action (with confirm) calling the existing `removeGoal`.

**17. Integration OAuth is a demo placeholder**
`ProfileScreen.connectIntegration` shows an alert and simulates a connected state. No real OAuth — deferred to the integrations phase (needs real provider OAuth).

**18. Authentication is entirely dummy** ✅ (Phase 1a — email/password)
Fixed: real **Supabase** email/password auth. `src/lib/supabase.ts` is the client (AsyncStorage session persistence + auto-refresh). `src/context/AuthContext.tsx` is now an `AuthProvider` exposing `session/user/loading/signIn/signUp/signOut/resetPassword` and subscribing to `onAuthStateChange`. `App.tsx` derives auth from the session (no more `@hustleon:is_authenticated` flag); `storage.ts` is onboarding-only. `LoginScreen`/`SignupScreen` call Supabase with loading + error states; "Forgot Password" sends a reset email. Apple + Google sign-in are deferred to Phase 1b (the Google buttons currently show a "coming soon" alert).

---

## Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env with your Gemini key
cp env.example .env
# Edit .env: GEMINI_API_KEY=AIza...

# 3. Start Expo dev server
npm start
# or: npm run ios / npm run android
```

The `.env` file is read by `app.config.js` at startup and injected into `Constants.expoConfig.extra.geminiApiKey`. Without it, AI features return an error message instead of crashing.

---

## Key Patterns

**State mutations always auto-save**: Every store action calls `get().saveData()` after updating state. The full `AppState` object is serialized as a single JSON blob to one AsyncStorage key. There is no partial update or migration strategy.

**Navigation wrapping pattern for FloatingAIButton**: Each tab screen is wrapped in a plain `View` that renders both the screen and `<FloatingAIButton />`. This is how the FAB appears on all tabs without being part of the tab bar itself.

**Gemini calls**: `generateGeminiResponse(prompt, systemPrompt?, history?)` posts to the `gemini-proxy` Edge Function. The function builds Gemini `contents` from the optional `history` (`{role:'user'|'model', text}[]`) plus the current user turn, and sets `systemInstruction` from `systemPrompt`. `AIChatScreen` passes its prior messages (capped to the last 20) so the coach is **multi-turn / conversational**; the per-screen advice calls (Calorie/BMI/Summary) omit `history` and stay single-turn.

**Cloud sync (Phase 2)**: The local store stays the source of truth; `src/lib/sync.ts` mirrors it to Supabase. A single `dataUpdatedAt` clock (in the store, bumped by `saveData()`, mirrored to `profiles.data_updated_at`) drives **whole-account last-write-wins**: remote-newer → pull, local-newer → push (full reconcile: upsert local rows + delete remote rows not present locally). `syncNow()` runs on launch (after `loadData()`), on app foreground, and debounced after local mutations (via `scheduleSync()`, triggered by an `App.tsx` store subscription). Per-type tables: `workouts/meals/bmi_records/body_measurements/goals/friends/supplements/progress_photos` each `(user_id, id, data jsonb, updated_at)`; `profiles` holds the user profile + scalar settings as `data jsonb` + the clock. Progress photos + profile pictures upload to the `progress-photos` Storage bucket (local `file://` URIs replaced with public URLs before push). RLS scopes every row/object to `auth.uid()`. Schema lives in `supabase/migrations/0001_init.sql` (run manually in the Supabase SQL editor). **Caveat:** account-level LWW, not per-row CRDT — last device to sync wins the whole account if two edit while offline.

**Motion & haptics**: reusable primitives in `src/components/` — `FadeInView` (fade+rise entrance), `PressableScale` (spring press + light haptic), `AnimatedProgressBar` (eased fill) — plus `src/utils/haptics.ts` (crash-proof `expo-haptics` wrapper: light/medium/success/selection). All use the built-in `Animated` API (New-Arch safe, no extra native deps). Conventions: success haptic only when something is actually logged; selection haptic for toggles/tab switches; `LayoutAnimation.configureNext` before list add/remove; pull-to-refresh on the three data tabs runs `syncNow()` via `src/hooks/useSyncRefresh.ts`. Keep motion communicative, not decorative — Summary/Profile/Chat stay calm.

**Error reporting**: route caught errors through `captureError(err, { scope })` from `src/lib/monitoring.ts` (not bare `console.error`) — it lazy-loads Sentry when `SENTRY_DSN` is configured and respects the Analytics opt-out.
