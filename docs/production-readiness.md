# HustleOn — Production Readiness

What it takes to ship HustleOn to the App Store, tiered by urgency. ✅ = done in code,
⏳ = needs you (accounts / hosting / manual), ☐ = not started.

Legend for "Owner": **Code** = I can do it in the repo · **You** = needs your accounts/hosting/decisions.

---

## 🔴 Tier 1 — Hard blockers (App Store rejects without these)

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| In-app account deletion | ✅ | Code | `delete-account` Edge Function + Profile "Delete Account" (double-confirm). Deploy the function. |
| Hosted Privacy Policy URL | ⏳ | You | App links to `https://hustleon.app/privacy` (placeholder in `ProfileScreen.tsx`). Host a real page + update the constant. |
| Hosted Terms of Service URL | ⏳ | You | Same — `https://hustleon.app/terms` placeholder. |
| App Privacy labels | ⏳ | You | Fill in App Store Connect. See `docs/app-store-checklist.md`. |
| Apple Sign In (Phase 1b) | ⏳ | Both | Required because Google is offered. Needs Apple enrollment + `expo-apple-authentication` wiring. |

## 🟠 Tier 2 — Needed before real users

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Private progress-photo storage | ✅ | Code | Bucket is now private; app uses signed URLs (migration `0002`). Run the migration. |
| AI rate-limit + prompt cap | ✅ | Code | `gemini-proxy`: 60 calls/user/day + 8k-char cap (`ai_usage` table). Run migration `0002` + redeploy the function. |
| Medical / AI disclaimer | ✅ | Code | Shown in the AI chat + all advice modals. |
| Legal links wired | ✅ | Code | Privacy / Terms / Support rows now open URLs (update the placeholder URLs). |
| Sync status UX | ✅ | Code | Profile shows syncing / last-synced / "sync failed — will retry" instead of silent failures. |
| Local cache cleared on logout/delete | ✅ | Code | `clearLocalData()` prevents one user seeing another's cached data on a shared device. |
| Dedicated prod Supabase project | ⏳ | You | Today: one project, keys hardcoded as defaults in `app.config.js` (fine for dev). For prod: separate project, keys via EAS env. |
| Supabase Pro tier | ⏳ | You | Free tier pauses on inactivity and has no backups. |
| Auth emails (SMTP) + re-enable email confirmation | ⏳ | You | Configure SMTP + templates + redirect URLs; turn email confirmation back on (off for dev). |
| Crash reporting (e.g. Sentry) | ☐ | Code | Not yet added. The Profile "Analytics" toggle currently controls nothing. |

## 🟡 Tier 3 — Quality / polish

| Item | Status | Owner | Notes |
|------|--------|-------|-------|
| Automated tests | ☐ | Code | None yet. Add smoke tests for auth, store, sync push/pull. |
| Offline detection (NetInfo) | ☐ | Code | Sync status is inferred from attempts; add real connectivity detection. |
| Per-row / CRDT sync | ☐ | Code | Current model is whole-account last-write-wins (see caveat below). |
| App Store assets | ⏳ | You | 1024² icon (no alpha), screenshots (6.7"/6.5"; iPad too since `supportsTablet: true` — or set false), description, keywords, age rating, category. |
| Splash matches dark theme | ☐ | Code | `userInterfaceStyle: 'light'` + white splash under a dark app; minor flash. |
| Confirm bundle identifier | ⏳ | You | Placeholder `com.hustleon.app` in `app.config.js` + `eas.json`. Permanent once registered. |

---

## Backend deploy checklist (do these in Supabase)

```bash
# In the Supabase SQL Editor, run in order:
#   supabase/migrations/0001_init.sql
#   supabase/migrations/0002_production.sql   (private bucket + ai_usage)

# Deploy Edge Functions:
supabase functions deploy gemini-proxy
supabase functions deploy delete-account
supabase secrets set GEMINI_API_KEY=AIza...
```

(`SUPABASE_SERVICE_ROLE_KEY` is injected automatically into Edge Functions — no need to set it.)

---

## Known caveats

- **Sync = whole-account last-write-wins.** If two devices edit while both offline, the last to sync wins the account. Fine for single-user; revisit for true multi-device.
- **Logout clears the local cache.** Data is cloud-backed, but an edit made offline and not yet synced is lost on logout. Acceptable given foreground/interval sync; note for future.
- **Signed photo URLs expire after 7 days** but are refreshed on every sync (launch + foreground), so they stay valid in normal use.

See [`TODO.md`](../TODO.md) for the running task list and [`docs/app-store-checklist.md`](app-store-checklist.md) for the submission runbook.
