// Centralized error/crash reporting seam.
//
// Sentry is loaded LAZILY and only when a DSN is configured, so:
//   - Expo Go / dev with no DSN never touches the native module (safe, no crash).
//   - Production dev-client builds with a DSN get real crash reporting.
//
// To activate crash reporting for a production build:
//   1. npm install @sentry/react-native
//   2. add the Sentry Expo config plugin in app.config.js and build a dev client
//   3. set SENTRY_DSN (env) or extra.sentryDsn
// Until then, this falls back to console and respects the user's Analytics opt-out.
import Constants from 'expo-constants';
import { useStore } from '../store';

const DSN =
  (Constants.expoConfig?.extra as { sentryDsn?: string } | undefined)?.sentryDsn ||
  process.env.SENTRY_DSN ||
  '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sentry: any = null;
let initialized = false;

export function initMonitoring(): void {
  if (initialized || !DSN) return;
  initialized = true;
  try {
    // Lazy require — never referenced when no DSN is set.
    sentry = require('@sentry/react-native');
    sentry.init({
      dsn: DSN,
      enableAutoSessionTracking: true,
      tracesSampleRate: 0.2,
    });
  } catch (error) {
    sentry = null;
    if (__DEV__) {
      console.warn('Sentry unavailable — crash reporting disabled. Install @sentry/react-native to enable.');
    }
  }
}

// Respect the user's "Analytics" privacy toggle.
function reportingAllowed(): boolean {
  try {
    return useStore.getState().privacySettings.analytics !== false;
  } catch {
    return true;
  }
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (sentry && reportingAllowed()) {
    try {
      sentry.captureException(error, context ? { extra: context } : undefined);
      return;
    } catch {
      // fall through to console
    }
  }
  console.error(error, context ?? '');
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (sentry && reportingAllowed()) {
    try {
      sentry.captureMessage(message, context ? { extra: context } : undefined);
      return;
    } catch {
      // fall through
    }
  }
  if (__DEV__) console.log('[monitoring]', message, context ?? '');
}
