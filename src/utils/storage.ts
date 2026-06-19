import AsyncStorage from '@react-native-async-storage/async-storage';

// Onboarding flag only. Authentication state is owned by Supabase (see src/lib/supabase.ts).
const ONBOARDING_KEY = '@hustleon:onboarding_completed';

export const storage = {
  async setOnboardingCompleted(value: boolean): Promise<void> {
    try {
      // Store as string "true" or "false" to ensure proper type
      await AsyncStorage.setItem(ONBOARDING_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  },

  async getOnboardingCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (value === null) {
        return false;
      }
      // Ensure we return a boolean, not a string
      return value === 'true';
    } catch (error) {
      console.error('Error reading onboarding status:', error);
      return false;
    }
  },
};

