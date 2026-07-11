// HustleOn — Account deletion Edge Function (Deno runtime).
//
// Required by App Store guideline 5.1.1(v): users must be able to delete their
// account in-app. This verifies the caller's JWT, then uses the service-role
// key to remove all of the user's data (table rows + storage files) and finally
// the auth user itself.
//
// Deploy:  supabase functions deploy delete-account
// (SUPABASE_SERVICE_ROLE_KEY is injected automatically in the Edge runtime.)
//
// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const USER_TABLES = [
  'workouts',
  'meals',
  'bmi_records',
  'body_measurements',
  'goals',
  'friends',
  'supplements',
  'progress_photos',
  'profiles',
];

const PHOTO_BUCKET = 'progress-photos';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header.' }, 401);
    }

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 1. Identify the caller from their JWT.
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized.' }, 401);
    }
    const userId = user.id;

    if (!serviceKey) {
      return json({ error: 'Server is not configured for account deletion.' }, 500);
    }

    // 2. Service-role client for privileged cleanup.
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Delete the user's storage files (best-effort).
    try {
      const { data: files } = await admin.storage.from(PHOTO_BUCKET).list(userId);
      if (files && files.length > 0) {
        const paths = files.map((f: any) => `${userId}/${f.name}`);
        await admin.storage.from(PHOTO_BUCKET).remove(paths);
      }
    } catch (e) {
      console.error('Storage cleanup failed (continuing):', e);
    }

    // 4. Delete all of the user's rows.
    for (const table of USER_TABLES) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error) {
        console.error(`Failed to delete from ${table}:`, error.message);
        return json({ error: `Failed to delete data from ${table}.` }, 500);
      }
    }

    // 5. Delete the auth user.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError.message);
      return json({ error: 'Failed to delete account.' }, 500);
    }

    return json({ success: true }, 200);
  } catch (error) {
    console.error('delete-account error:', error);
    return json({ error: 'Internal error.' }, 500);
  }
});
