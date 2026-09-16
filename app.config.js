const path = require('path');

// Load .env from project root (used for optional Supabase overrides only).
// NOTE: GEMINI_API_KEY is NOT read here — it lives as a Supabase Edge Function
// secret (gemini-proxy) and must never ship in the app bundle.
// `quiet: true` matters: dotenv otherwise prints a promo banner to STDOUT, which
// corrupts the JSON that tooling parses out of this config (it made
// `expo-doctor`'s dependency check fail with a JSON.parse error even though
// there were no mismatches).
require('dotenv').config({ path: path.resolve(__dirname, '.env'), quiet: true });

module.exports = {
  expo: {
    name: 'HustleOn',
    slug: 'HustleOn',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'hustleon',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1e1e2e',
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
      // TODO: confirm before the first Play Console upload — permanent once registered.
      package: 'com.hustleon.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        // Must not be white: the foreground mark is white and would vanish.
        backgroundColor: '#7864b4',
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
      // Crash reporting DSN (optional). Empty = disabled. See src/lib/monitoring.ts.
      sentryDsn: process.env.SENTRY_DSN || '',
    },
    plugins: [
      ['expo-notifications', {}],
      // Required: injects NSPhotoLibraryUsageDescription. Without this plugin the
      // Info.plist key is missing and iOS kills the app on the first photo pick.
      [
        'expo-image-picker',
        {
          photosPermission:
            'HustleOn needs access to your photos so you can add progress photos and a profile picture.',
          // The app only ever calls launchImageLibraryAsync — declaring camera or
          // microphone access we never use invites App Review questions. Flip these
          // to strings if in-app capture is added.
          cameraPermission: false,
          microphonePermission: false,
        },
      ],
      // @expo/vector-icons peer dependency; also required as a config plugin.
      'expo-font',
      '@react-native-community/datetimepicker',
    ],
  },
};

