# HustleOn — Supabase Backend

Backend setup for HustleOn: Postgres schema + RLS, a Storage bucket for photos, and the `gemini-proxy` Edge Function that holds the Gemini API key server-side.

- **Project ref:** `xwpiwpozjhrzepxbtgaf`
- **URL:** `https://xwpiwpozjhrzepxbtgaf.supabase.co`

```
supabase/
├── migrations/0001_init.sql   # Tables + RLS + Storage bucket (run once)
└── functions/gemini-proxy/    # Edge Function (deploy once; redeploy on change)
```

---

## 1. Database schema + RLS + Storage bucket

Run [`migrations/0001_init.sql`](migrations/0001_init.sql) once. It is idempotent (safe to re-run).

**Easiest — SQL Editor:**
1. Supabase Dashboard → **SQL Editor** → **New query**
2. Paste the entire contents of `migrations/0001_init.sql`
3. **Run**

**Or via CLI:**
```bash
supabase login
supabase link --project-ref xwpiwpozjhrzepxbtgaf
supabase db push        # applies files in supabase/migrations
```

### What it creates
- **`profiles`** — one row per user: `(user_id, data jsonb, data_updated_at)`. `data` holds the user profile + scalar settings; `data_updated_at` is the whole-account sync clock.
- **Per-type tables** — `workouts`, `meals`, `bmi_records`, `body_measurements`, `goals`, `friends`, `supplements`, `progress_photos`, each `(user_id, id, data jsonb, updated_at)` with an `updated_at` trigger.
- **RLS** — every table is row-level-security enabled, scoped to `auth.uid() = user_id`.
- **Storage** — public bucket `progress-photos` with per-user-folder policies (`<user_id>/<file>`), for progress photos + profile pictures.

---

## 2. Gemini proxy Edge Function

The Gemini API key is a **server secret**, never in the app bundle. The client calls
`supabase.functions.invoke('gemini-proxy', ...)`; the function verifies the caller's JWT
and forwards the prompt to Gemini.

```bash
# One-time
brew install supabase/tap/supabase
supabase login
supabase link --project-ref xwpiwpozjhrzepxbtgaf

# Set the Gemini key as a secret (get one at https://aistudio.google.com/apikey)
supabase secrets set GEMINI_API_KEY=AIza...your_key...

# Deploy (re-run after any change to functions/gemini-proxy/index.ts)
supabase functions deploy gemini-proxy
```

- **Auth:** JWT verification is on by default — unauthenticated calls are rejected.
- **Logs:** Dashboard → **Edge Functions → gemini-proxy → Logs**.
- **Model:** `gemini-2.5-flash`. Request body: `{ prompt, systemPrompt }` → response `{ text }`.

---

## Verify

- **Sync:** sign in, add a workout → a row appears in the `workouts` table within ~2s.
- **Photos:** add a progress photo → a file appears in the `progress-photos` bucket and the `progress_photos` row's `data.uri` is an `https://…` URL.
- **AI:** ask the AI coach a question → response returns, and an invocation shows in the function logs.
- **Key absent from client:** `grep -ri "AIza" .` (excluding `.env`) returns nothing.

---

## Notes

- **Conflict model:** whole-account last-write-wins by `profiles.data_updated_at` (not per-row CRDT). Fine for a single-user app; the last device to sync wins the account.
- **Email confirmation:** for dev, disable it under **Authentication → Providers → Email** so signup logs in immediately. Re-enable before TestFlight.
