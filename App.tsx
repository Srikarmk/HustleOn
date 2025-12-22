import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { MainNavigatorWithStack } from './src/navigation/MainNavigator';
import { storage } from './src/utils/storage';
import { COLORS } from './src/constants/theme';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAppStatus();
    
    // Listen for app state changes to re-check after logout
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkAppStatus();
      }
    });
    
    return () => {
      subscription?.remove();
    };
  }, []);

  const checkAppStatus = async () => {
    try {
      const [onboardingCompleted, authenticated] = await Promise.all([
        storage.getOnboardingCompleted(),
        storage.getIsAuthenticated(),
      ]);
      setHasCompletedOnboarding(onboardingCompleted);
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking app status:', error);
      setHasCompletedOnboarding(false);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = async () => {
    try {
      await storage.setOnboardingCompleted(true);
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await storage.setIsAuthenticated(true);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving auth status:', error);
    }
  };

  const handleSignup = async () => {
    try {
      await storage.setIsAuthenticated(true);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving auth status:', error);
    }
  };

  const handleGoogleSignup = async () => {
    // Dummy Google signup - same as regular signup
    try {
      await storage.setIsAuthenticated(true);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving auth status:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        {!hasCompletedOnboarding ? (
          <OnboardingNavigator onComplete={handleOnboardingComplete} />
        ) : !isAuthenticated ? (
          <AuthNavigator
            onLogin={handleLogin}
            onSignup={handleSignup}
            onGoogleSignup={handleGoogleSignup}
          />
        ) : (
          <MainNavigatorWithStack />
        )}
      </NavigationContainer>
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
