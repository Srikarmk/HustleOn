import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { useStore } from '../store';
import { captureError } from './monitoring';
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

// PostgREST caps a single response (Supabase's default `db-max-rows` is 1000).
// Anything that reads or reconciles a whole collection must page, or a user
// with more than a page of meals silently loses the remainder: the pull would
// truncate, and the next push would then delete the rows it never saw.
const PAGE_SIZE = 1000;
// Keep write payloads and URL lengths sane for large collections.
const UPSERT_CHUNK = 500;
const DELETE_CHUNK = 200;

let syncing = false;

/** Read every row of a user's collection, a page at a time. */
async function selectAllRows<T>(
  table: string,
  columns: string,
  userId: string
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('user_id', userId)
      // A stable order is required for range paging to be coherent.
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const isRemoteUri = (uri: string) => /^https?:\/\//.test(uri);

// Signed URLs last 7 days; they're refreshed on every sync (launch + foreground).
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

/** Upload a local file:// image to the private bucket; returns the object path (or null). */
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
      captureError(error, { scope: 'sync.uploadPhoto' });
      return null;
    }
    return path;
  } catch (error) {
    captureError(error, { scope: 'sync.uploadPhoto' });
    return null;
  }
}

/** Create a short-lived signed URL for a private object path (or null on failure). */
async function signPath(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) {
    captureError(error, { scope: 'sync.signPath' });
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Upload any not-yet-uploaded local photos; store the object path + a fresh signed URL. */
async function uploadPendingPhotos(userId: string): Promise<void> {
  const state = useStore.getState();
  let changed = false;

  const photos = await Promise.all(
    state.progressPhotos.map(async (photo) => {
      if (!photo.storagePath && photo.uri && !isRemoteUri(photo.uri)) {
        const path = await uploadPhoto(userId, photo.uri);
        if (path) {
          changed = true;
          const signed = await signPath(path);
          return { ...photo, storagePath: path, uri: signed ?? photo.uri };
        }
      }
      return photo;
    })
  );

  let userProfile = state.userProfile;
  if (
    userProfile?.profilePictureUri &&
    !userProfile.profilePicturePath &&
    !isRemoteUri(userProfile.profilePictureUri)
  ) {
    const path = await uploadPhoto(userId, userProfile.profilePictureUri);
    if (path) {
      changed = true;
      const signed = await signPath(path);
      userProfile = {
        ...userProfile,
        profilePicturePath: path,
        profilePictureUri: signed ?? userProfile.profilePictureUri,
      };
    }
  }

  if (changed) {
    useStore.setState({ progressPhotos: photos, userProfile });
    // saveData() bumps the clock + persists; the object paths become what we push.
    await useStore.getState().saveData();
  }
}

/**
 * Delete storage objects the user no longer references.
 *
 * `removeProgressPhoto` only drops the local row, so deleted photos used to
 * leave their uploaded file in the bucket forever. Reconciling here (rather than
 * in the store) keeps Supabase out of the store layer and means a photo deleted
 * while offline is still cleaned up on the next sync.
 */
async function reconcilePhotoStorage(userId: string): Promise<void> {
  const state = useStore.getState();
  const referenced = new Set<string>();
  for (const photo of state.progressPhotos) {
    if (photo.storagePath) referenced.add(photo.storagePath);
  }
  if (state.userProfile?.profilePicturePath) {
    referenced.add(state.userProfile.profilePicturePath);
  }

  // `list` defaults to 100 objects, so page it.
  const orphans: string[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .list(userId, { limit: PAGE_SIZE, offset });
    if (error) {
      captureError(error, { scope: 'sync.listPhotoStorage' });
      return;
    }
    const batch = data ?? [];
    for (const file of batch) {
      const path = `${userId}/${file.name}`;
      if (!referenced.has(path)) orphans.push(path);
    }
    if (batch.length < PAGE_SIZE) break;
  }

  for (const batch of chunk(orphans, DELETE_CHUNK)) {
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove(batch);
    if (error) captureError(error, { scope: 'sync.removeOrphanedPhotos' });
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
    captureError(error, { scope: 'sync.fetchRemoteClock' });
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

  // Collections (paged — see PAGE_SIZE)
  const collectionResults: Record<string, any[]> = {};
  for (const [table, key] of COLLECTIONS) {
    const rows = await selectAllRows<{ data: any }>(table, 'data', userId);
    collectionResults[key] = rows.map((r) => r.data);
  }

  // Photos come back with their private object path; mint fresh signed URLs for display.
  const progressPhotos = await Promise.all(
    collectionResults.progressPhotos.map(async (photo: any) => {
      if (photo?.storagePath) {
        const signed = await signPath(photo.storagePath);
        return signed ? { ...photo, uri: signed } : photo;
      }
      return photo;
    })
  );

  let userProfile = pdata.userProfile ?? null;
  if (userProfile?.profilePicturePath) {
    const signed = await signPath(userProfile.profilePicturePath);
    if (signed) userProfile = { ...userProfile, profilePictureUri: signed };
  }

  const snapshot: RemoteSnapshot = {
    userProfile,
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
    progressPhotos,
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

    for (const batch of chunk(items, UPSERT_CHUNK)) {
      const rows = batch.map((item) => ({ user_id: userId, id: item.id, data: item }));
      const { error } = await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
    }

    // Must be paged: reading only the first page here would leave rows beyond it
    // undeleted, and (worse) a truncated read on the pull side would have made
    // them look deletable.
    const existing = await selectAllRows<{ id: string }>(table, 'id', userId);
    const toDelete = existing.map((r) => r.id).filter((id) => !localIds.has(id));
    for (const batch of chunk(toDelete, DELETE_CHUNK)) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId).in('id', batch);
      if (error) throw error;
    }
  }
}

/**
 * Run one sync pass. Safe to call on launch and on app foreground.
 * No-ops when signed out, offline, or already syncing.
 */
/**
 * Pure last-write-wins decision. Uses epoch millis so it tolerates the format
 * difference between JS ISO ('…Z') and Postgres timestamptz ('…+00:00').
 */
export function decideSyncDirection(
  localTs: string,
  remoteTs: string | null
): 'pull' | 'push' | 'noop' {
  const localMs = new Date(localTs).getTime();
  const remoteMs = remoteTs ? new Date(remoteTs).getTime() : 0;
  if (remoteTs && remoteMs > localMs) return 'pull';
  if (!remoteTs || localMs > remoteMs) return 'push';
  return 'noop';
}

export async function syncNow(): Promise<void> {
  if (syncing) return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  // Honour the user's Cloud Sync choice. This switch existed in the UI for a
  // while without being read here, so the app uploaded health data, photos and
  // profile regardless of its position.
  if (!useStore.getState().privacySettings.cloudSync) {
    useStore.getState().setSyncState('disabled');
    return;
  }

  // Skip when offline; the App reconnect listener retries on the next connection.
  const net = await NetInfo.fetch();
  if (net.isConnected === false) {
    useStore.getState().setSyncState('offline');
    return;
  }

  syncing = true;
  useStore.getState().setSyncState('syncing');
  try {
    const remoteTs = await fetchRemoteClock(userId);
    const localTs = useStore.getState().dataUpdatedAt;

    const direction = decideSyncDirection(localTs, remoteTs);
    if (direction === 'pull' && remoteTs) {
      await pull(userId, remoteTs);
    } else if (direction === 'push') {
      await uploadPendingPhotos(userId);
      const ts = useStore.getState().dataUpdatedAt;
      await push(userId, ts);
      // Best-effort; a failure here must not fail the sync.
      await reconcilePhotoStorage(userId);
    }
    // noop -> nothing to do
    useStore.getState().setSyncState('synced', new Date().toISOString());
  } catch (error) {
    // Offline or transient failure — try again on the next trigger.
    captureError(error, { scope: 'sync' });
    useStore.getState().setSyncState('error');
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
