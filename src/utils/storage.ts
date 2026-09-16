import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureError } from '../lib/monitoring';

// Onboarding flags only. Authentication state is owned by Supabase
// (see src/lib/supabase.ts).
//
// Two separate flags, because onboarding straddles sign-in:
//   - `intro`         device-global. Welcome/Features are marketing and write
//                     nothing, so "seen once on this device" is the right scope.
//   - `profileSetup`  per user. It used to be one device-global key, so a second
//                     account signing in on the same device skipped profile
//                     setup entirely and ended up with no profile.
const LEGACY_KEY = '@hustleon:onboarding_completed';
const INTRO_KEY = '@hustleon:intro_seen';
const profileSetupKey = (userId: string) => `@hustleon:profile_setup:${userId}`;

async function getFlag(key: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(key)) === 'true';
  } catch (error) {
    captureError(error, { scope: 'storage.get', key });
    return false;
  }
}

async function setFlag(key: string, value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  } catch (error) {
    captureError(error, { scope: 'storage.set', key });
  }
}

export const storage = {
  getIntroSeen: () => getFlag(INTRO_KEY),
  setIntroSeen: (value: boolean) => setFlag(INTRO_KEY, value),

  getProfileSetupCompleted: (userId: string) => getFlag(profileSetupKey(userId)),
  setProfileSetupCompleted: (userId: string, value: boolean) =>
    setFlag(profileSetupKey(userId), value),

  /**
   * Migrate the single pre-split flag. Anyone who had completed the old combined
   * onboarding has already seen the intro, so carry that across and drop the key.
   */
  async migrateLegacyOnboardingFlag(): Promise<void> {
    try {
      const legacy = await AsyncStorage.getItem(LEGACY_KEY);
      if (legacy === null) return;
      if (legacy === 'true') await setFlag(INTRO_KEY, true);
      await AsyncStorage.removeItem(LEGACY_KEY);
    } catch {
      // best-effort
    }
  },
};
