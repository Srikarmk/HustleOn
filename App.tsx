import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigatorWithStack } from './src/navigation/MainNavigator';
import { storage } from './src/utils/storage';
import {
  requestNotificationPermissions,
  scheduleAllNotifications,
  updateBadgeCount,
  cancelAllNotifications,
} from './src/utils/notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { useStore } from './src/store';
import { syncNow, scheduleSync } from './src/lib/sync';
import { initMonitoring } from './src/lib/monitoring';
import { COLORS } from './src/constants/theme';

// Initialize crash reporting as early as possible (no-op until a DSN is set).
initMonitoring();

// Show notifications while app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const AppContent: React.FC = () => {
  const { session, loading: authLoading } = useAuth();
  const isAuthenticated = !!session;

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const { loadData, currentStreak } = useStore();

  // Read the onboarding flag once at launch (auth comes from Supabase session).
  useEffect(() => {
    storage
      .getOnboardingCompleted()
      .then(setHasCompletedOnboarding)
      .catch((error) => console.error('Error reading onboarding status:', error))
      .finally(() => setOnboardingChecked(true));
  }, []);

  // When authenticated + onboarded: load local data, sync with the cloud,
  // then (re)schedule notifications from the (possibly pulled) preferences.
  useEffect(() => {
    if (isAuthenticated && hasCompletedOnboarding) {
      (async () => {
        await loadData();
        await syncNow();
        await requestNotificationPermissions();
        const s = useStore.getState();
        await scheduleAllNotifications(s.notificationPreferences, s.currentStreak);
      })().catch(console.error);
    }
  }, [isAuthenticated, hasCompletedOnboarding]);

  // Sync on app foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        syncNow().catch(console.error);
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  // Debounced push whenever a local mutation advances the sync clock.
  useEffect(() => {
    if (!isAuthenticated) return;
    let last = useStore.getState().dataUpdatedAt;
    const unsub = useStore.subscribe((state) => {
      if (state.dataUpdatedAt !== last) {
        last = state.dataUpdatedAt;
        scheduleSync();
      }
    });
    return unsub;
  }, [isAuthenticated]);

  // Clear scheduled notifications + badge when the user signs out.
  useEffect(() => {
    if (onboardingChecked && !isAuthenticated) {
      cancelAllNotifications().catch(console.error);
    }
  }, [isAuthenticated, onboardingChecked]);

  // Keep badge in sync with current streak.
  useEffect(() => {
    if (isAuthenticated) {
      updateBadgeCount(currentStreak).catch(console.error);
    }
  }, [currentStreak, isAuthenticated]);

  const handleOnboardingComplete = async () => {
    try {
      await storage.setOnboardingCompleted(true);
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  if (authLoading || !onboardingChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {!hasCompletedOnboarding ? (
        <OnboardingNavigator onComplete={handleOnboardingComplete} />
      ) : !isAuthenticated ? (
        <AuthNavigator />
      ) : (
        <MainNavigatorWithStack />
      )}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
