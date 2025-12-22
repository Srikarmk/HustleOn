import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@hustleon:onboarding_completed';
const AUTH_KEY = '@hustleon:is_authenticated';

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

  async setIsAuthenticated(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_KEY, value ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving auth status:', error);
    }
  },

  async getIsAuthenticated(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(AUTH_KEY);
      if (value === null) {
        return false;
      }
      return value === 'true';
    } catch (error) {
      console.error('Error reading auth status:', error);
      return false;
    }
  },

  async logout(): Promise<void> {
    try {
      // Clear both authentication and onboarding
      await AsyncStorage.multiRemove([AUTH_KEY, ONBOARDING_KEY]);
      console.log('Logout successful - cleared auth and onboarding');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  },
};

