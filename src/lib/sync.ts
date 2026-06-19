import { supabase } from './supabase';
import { useStore } from '../store';
import type { RemoteSnapshot } from '../types';

/**
 * Cloud sync — whole-account last-write-wins.
 *
 * The local Zustand/AsyncStorage store is the source of truth. We keep a single
 * `dataUpdatedAt` clock locally (bumped on every local mutation) and mirror it
 * to `profiles.data_updated_at` in Supabase. On sync we compare the two:
 *   - remote newer  -> PULL  (replace local with remote)
 *   - local newer   -> PUSH  (replace remote with local)
 *   - equal         -> no-op
 *
 * Caveat: this is account-level LWW, not per-row CRDT. If two devices edit
 * while both offline, whichever syncs last wins the whole account. Acceptable
 * for a single-user app; revisit if real-time multi-device merge is needed.
 */

// Supabase table name -> store array key
const COLLECTIONS = [
  ['workouts', 'workouts'],
  ['meals', 'meals'],
  ['bmi_records', 'bmiRecords'],
  ['body_measurements', 'bodyMeasurements'],
  ['goals', 'goals'],
  ['friends', 'friends'],
  ['supplements', 'supplements'],
  ['progress_photos', 'progressPhotos'],
] as const;

const PHOTO_BUCKET = 'progress-photos';

let syncing = false;

const isRemoteUri = (uri: string) => /^https?:\/\//.test(uri);

/** Upload a local file:// image to Storage; returns its public URL (or null on failure). */
async function uploadPhoto(userId: string, uri: string): Promise<string | null> {
  try {
    const response = await fetch(uri);
    const arrayBuffer = await response.arrayBuffer();
    const rawExt = uri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const ext = rawExt.length <= 4 ? rawExt : 'jpg';
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, arrayBuffer, { contentType, upsert: false });
    if (error) {
      console.error('Photo upload failed:', error.message);
      return null;
    }
    const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (error) {
    console.error('Photo upload error:', error);
    return null;
  }
}

/** Replace any local file:// photo/profile URIs with uploaded Storage URLs. */
async function uploadPendingPhotos(userId: string): Promise<void> {
  const state = useStore.getState();
  let changed = false;

  const photos = await Promise.all(
    state.progressPhotos.map(async (photo) => {
      if (!isRemoteUri(photo.uri)) {
        const url = await uploadPhoto(userId, photo.uri);
        if (url) {
          changed = true;
          return { ...photo, uri: url };
        }
      }
      return photo;
    })
  );

  let userProfile = state.userProfile;
  if (userProfile?.profilePictureUri && !isRemoteUri(userProfile.profilePictureUri)) {
    const url = await uploadPhoto(userId, userProfile.profilePictureUri);
    if (url) {
      changed = true;
      userProfile = { ...userProfile, profilePictureUri: url };
    }
  }

  if (changed) {
    useStore.setState({ progressPhotos: photos, userProfile });
    // saveData() bumps the clock + persists; the new URLs become the value we push.
    await useStore.getState().saveData();
  }
}

/** Read the remote sync clock (null if the user has never synced). */
async function fetchRemoteClock(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('data_updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('Failed to read remote clock:', error.message);
    throw error;
  }
  return data?.data_updated_at ?? null;
}

async function pull(userId: string, remoteTs: string): Promise<void> {
  const current = useStore.getState();

  // Profile + scalar settings live in profiles.data
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (profileError) throw profileError;
  const pdata = (profileRow?.data ?? {}) as Partial<RemoteSnapshot>;

  // Collections
  const collectionResults: Record<string, any[]> = {};
  for (const [table, key] of COLLECTIONS) {
    const { data, error } = await supabase.from(table).select('data').eq('user_id', userId);
    if (error) throw error;
    collectionResults[key] = (data ?? []).map((r) => r.data);
  }

  const snapshot: RemoteSnapshot = {
    userProfile: pdata.userProfile ?? null,
    privacySettings: pdata.privacySettings ?? current.privacySettings,
    themeSettings: pdata.themeSettings ?? current.themeSettings,
    notificationPreferences: pdata.notificationPreferences ?? current.notificationPreferences,
    integrations: pdata.integrations ?? current.integrations,
    weeklyGoal: pdata.weeklyGoal ?? current.weeklyGoal,
    calorieGoal: pdata.calorieGoal ?? current.calorieGoal,
    workouts: collectionResults.workouts,
    meals: collectionResults.meals,
    bmiRecords: collectionResults.bmiRecords,
    bodyMeasurements: collectionResults.bodyMeasurements,
    goals: collectionResults.goals,
    friends: collectionResults.friends,
    supplements: collectionResults.supplements,
    progressPhotos: collectionResults.progressPhotos,
  };

  await useStore.getState().applyRemoteState(snapshot, remoteTs);
}

async function push(userId: string, localTs: string): Promise<void> {
  const state = useStore.getState();

  // profiles (singleton): user profile + scalar settings + the sync clock
  const profileData = {
    userProfile: state.userProfile,
    privacySettings: state.privacySettings,
    themeSettings: state.themeSettings,
    notificationPreferences: state.notificationPreferences,
    integrations: state.integrations,
    weeklyGoal: state.weeklyGoal,
    calorieGoal: state.calorieGoal,
  };
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, data: profileData, data_updated_at: localTs }, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  // Collections: upsert local rows, then delete remote rows no longer present.
  for (const [table, key] of COLLECTIONS) {
    const items = (state as any)[key] as Array<{ id: string }>;
    const localIds = new Set(items.map((i) => i.id));

    if (items.length > 0) {
      const rows = items.map((item) => ({ user_id: userId, id: item.id, data: item }));
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
    }

    const { data: existing, error: selErr } = await supabase
      .from(table)
      .select('id')
      .eq('user_id', userId);
    if (selErr) throw selErr;
    const toDelete = (existing ?? []).map((r) => r.id).filter((id) => !localIds.has(id));
    if (toDelete.length > 0) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId).in('id', toDelete);
      if (error) throw error;
    }
  }
}

/**
 * Run one sync pass. Safe to call on launch and on app foreground.
 * No-ops when signed out, offline, or already syncing.
 */
export async function syncNow(): Promise<void> {
  if (syncing) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  syncing = true;
  try {
    const remoteTs = await fetchRemoteClock(userId);
    const localTs = useStore.getState().dataUpdatedAt;
    const remoteMs = remoteTs ? new Date(remoteTs).getTime() : 0;
    const localMs = new Date(localTs).getTime();

    if (remoteTs && remoteMs > localMs) {
      await pull(userId, remoteTs);
    } else if (!remoteTs || localMs > remoteMs) {
      await uploadPendingPhotos(userId);
      const ts = useStore.getState().dataUpdatedAt;
      await push(userId, ts);
    }
    // equal -> nothing to do
  } catch (error) {
    // Offline or transient failure — try again on the next trigger.
    console.error('Sync failed:', error);
  } finally {
    syncing = false;
  }
}

// Debounced push trigger for use after local mutations.
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleSync(delayMs = 2000): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncNow();
  }, delayMs);
}
