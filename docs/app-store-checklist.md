# HustleOn — App Store / TestFlight Checklist (Phase 4)

Everything needed to get a build into TestFlight. Code config (`eas.json`, `app.config.js`
privacy manifest + bundle id) is **already in the repo**; the items below are the
account/credential steps + the build commands.

> **Gate:** Apple Developer Program enrollment must be complete.

---

## 1. Prerequisites (gather)

- [ ] **Apple Developer Program** enrollment active (~$99/yr)
- [ ] **Apple ID** email used for App Store Connect → put in `eas.json` `submit.production.ios.appleId`
- [ ] **Apple Team ID** (Apple Developer → Membership) → `eas.json` `appleTeamId`
- [ ] **App Store Connect app record** created → its **App ID (ascAppId)** → `eas.json` `ascAppId`
- [ ] **Expo account** (`npx expo login`) and `eas init` run once (writes `extra.eas.projectId`)
- [ ] **Bundle identifier confirmed** — currently the placeholder `com.hustleon.app` in `app.config.js`. **Change before the first build — it is permanent.**

---

## 2. App Store Connect — App Privacy labels

Declare these under **App Store Connect → your app → App Privacy**. HustleOn collects:

| Data type | Collected? | Linked to user? | Used for tracking? | Notes |
|-----------|-----------|-----------------|--------------------|-------|
| Health & Fitness (workouts, weight, BMI, measurements) | Yes | Yes | No | Stored in user's Supabase account |
| Photos (progress photos, profile picture) | Yes | Yes | No | Supabase Storage |
| Contact info (email) | Yes | Yes | No | Auth account |
| Identifiers (user ID) | Yes | Yes | No | Supabase `auth.uid()` |
| Other user content (AI chat messages) | Yes | Yes | No | Sent to Gemini via the Edge Function |

- **Tracking:** No (the app does not track across other apps/companies). Matches `NSPrivacyTracking: false`.
- The required-reason API manifest (UserDefaults, FileTimestamp) is already declared in `app.config.js` → `ios.privacyManifests`.

> If the "Share Data with AI" privacy toggle is off, AI calls should be suppressed — verify before submission (see TODO).

---

## 3. Build & submit

```bash
# One-time
npm install -g eas-cli
eas login
eas init            # links the repo to an Expo project (sets extra.eas.projectId)

# Build the production iOS app (cloud build; handles signing)
eas build --platform ios --profile production

# Submit the build to App Store Connect / TestFlight
eas submit --platform ios --profile production
```

Then in App Store Connect → **TestFlight**, add internal testers and install on a physical device.

---

## 4. Pre-submit verification

- [ ] App icon + splash render correctly (assets in `assets/`)
- [ ] Notification permission prompt appears; a scheduled reminder fires on device
- [ ] Sign up / log in works against Supabase
- [ ] Data + photos sync across two devices
- [ ] AI features work (Edge Function deployed, secret set)
- [ ] No Gemini key in the bundle: `grep -ri "AIza" .` (excluding `.env`) is empty

---

## Notes

- **Managed workflow:** there is no `ios/` folder or standalone `PrivacyInfo.xcprivacy`. The privacy manifest lives in `app.config.js` (`ios.privacyManifests`) and EAS generates the native manifest at build time.
- **Remote push** is out of scope — only local notifications are used, so no APNs key is required.
