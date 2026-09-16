import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import { IntroNavigator, ProfileSetupNavigator } from './src/navigation/OnboardingNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { ResetPasswordScreen } from './src/screens/Auth/ResetPasswordScreen';
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
import { initMonitoring, captureError } from './src/lib/monitoring';
import { COLORS } from './src/constants/theme';

// Initialize crash reporting as early as possible (no-op until a DSN is set).
initMonitoring();

// Show notifications while app is in the foreground.
// `shouldShowAlert` was split into banner + list in expo-notifications 0.30.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const AppContent: React.FC = () => {
  const { session, loading: authLoading, passwordRecovery } = useAuth();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = !!userId;

  const [introChecked, setIntroChecked] = useState(false);
  const [introSeen, setIntroSeen] = useState(false);
  // Null until this user's data has been loaded + synced and we know whether
  // they still need profile setup.
  const [profileSetupDone, setProfileSetupDone] = useState<boolean | null>(null);

  const { loadData, currentStreak } = useStore();

  // Read the device-global intro flag once at launch (migrating the old key).
  useEffect(() => {
    storage
      .migrateLegacyOnboardingFlag()
      .then(() => storage.getIntroSeen())
      .then(setIntroSeen)
      .catch((error) => captureError(error, { scope: 'intro-flag' }))
      .finally(() => setIntroChecked(true));
  }, []);

  // Per-user bootstrap. Load local data and sync BEFORE deciding whether profile
  // setup is needed, so an existing user on a new device doesn't re-onboard (and
  // doesn't overwrite their cloud profile with a blank one).
  useEffect(() => {
    if (!userId) {
      setProfileSetupDone(null);
      return;
    }
    let cancelled = false;
    (async () => {
      await loadData();
      await syncNow();

      const flagged = await storage.getProfileSetupCompleted(userId);
      // A profile in the store (local or just pulled) means this user has been
      // through setup before — covers reinstalls and pre-split installs.
      const done = flagged || !!useStore.getState().userProfile;
      if (done && !flagged) await storage.setProfileSetupCompleted(userId, true);
      if (cancelled) return;
      setProfileSetupDone(done);

      await requestNotificationPermissions();
      const s = useStore.getState();
      await scheduleAllNotifications(s.notificationPreferences, s.currentStreak);
    })().catch((error) => {
      captureError(error, { scope: 'bootstrap' });
      // Don't trap the user on a spinner if bootstrap fails.
      if (!cancelled) setProfileSetupDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Sync on app foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isAuthenticated) {
        syncNow().catch((error) => captureError(error, { scope: 'sync.trigger' }));
      }
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  // Sync when connectivity is regained.
  useEffect(() => {
    if (!isAuthenticated) return;
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncNow().catch((error) => captureError(error, { scope: 'sync.trigger' }));
      }
    });
    return unsub;
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
    if (introChecked && !isAuthenticated) {
      cancelAllNotifications().catch((error) => captureError(error, { scope: 'notifications.cancel' }));
    }
  }, [isAuthenticated, introChecked]);

  // Keep badge in sync with current streak.
  useEffect(() => {
    if (isAuthenticated) {
      updateBadgeCount(currentStreak).catch((error) => captureError(error, { scope: 'notifications.badge' }));
    }
  }, [currentStreak, isAuthenticated]);

  const handleIntroComplete = async () => {
    await storage.setIntroSeen(true).catch(() => {});
    setIntroSeen(true);
  };

  const handleProfileSetupComplete = async () => {
    if (userId) await storage.setProfileSetupCompleted(userId, true);
    setProfileSetupDone(true);
  };

  const spinner = (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <StatusBar style="light" />
    </View>
  );

  if (authLoading || !introChecked) return spinner;

  // Phase order: password recovery → intro (marketing) → auth → profile setup
  // (writes data) → app. Recovery wins: the emailed link signs the user in with
  // a recovery session, so without this they'd land straight in the app with no
  // way to actually set a new password.
  let content: React.ReactNode;
  if (passwordRecovery) {
    content = <ResetPasswordScreen />;
  } else if (!introSeen) {
    content = <IntroNavigator onComplete={handleIntroComplete} />;
  } else if (!isAuthenticated) {
    content = <AuthNavigator />;
  } else if (profileSetupDone === null) {
    // Signed in, but still loading/syncing this user's data.
    return spinner;
  } else if (!profileSetupDone) {
    content = <ProfileSetupNavigator onComplete={handleProfileSetupComplete} />;
  } else {
    content = <MainNavigatorWithStack />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      {content}
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
