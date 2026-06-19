const path = require('path');

// Load .env from project root (used for optional Supabase overrides only).
// NOTE: GEMINI_API_KEY is NOT read here — it lives as a Supabase Edge Function
// secret (gemini-proxy) and must never ship in the app bundle.
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  expo: {
    name: 'HustleOn',
    slug: 'HustleOn',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      // TODO: confirm before the first App Store Connect build — permanent once registered.
      bundleIdentifier: 'com.hustleon.app',
      buildNumber: '1',
      infoPlist: {
        NSUserNotificationsUsageDescription:
          'HustleOn sends workout reminders and streak updates to keep you on track.',
      },
      // Apple required-reason API declarations (managed-workflow privacy manifest).
      privacyManifests: {
        NSPrivacyTracking: false,
        NSPrivacyCollectedDataTypes: [],
        NSPrivacyAccessedAPITypes: [
          {
            // AsyncStorage (session + app data) uses UserDefaults.
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
          {
            // expo-file-system / image picker read file timestamps.
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
            NSPrivacyAccessedAPITypeReasons: ['C617.1'],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      // Supabase URL + anon key are public client values; data is protected by RLS.
      // Override per-environment via .env if needed.
      supabaseUrl: process.env.SUPABASE_URL || 'https://xwpiwpozjhrzepxbtgaf.supabase.co',
      supabaseAnonKey:
        process.env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cGl3cG96amhyemVweGJ0Z2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU2NzgsImV4cCI6MjA5NjQ1MTY3OH0.cBBuqD6YwwWl8Zwta7lbf4Z6e6RM7Yo9zaun9H2Fg_E',
    },
    plugins: [
      ['expo-notifications', {}],
    ],
  },
};

