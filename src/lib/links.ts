import Constants from 'expo-constants';

/**
 * Deep-link helpers for Supabase auth redirects.
 *
 * Supabase emails a `/auth/v1/verify` link; after verifying it redirects to our
 * `redirectTo`, appending the session as URL *fragment* parameters, e.g.
 *
 *   hustleon://reset-password#access_token=…&refresh_token=…&type=recovery
 *
 * Errors come back the same way (`#error=…&error_description=…`), and some
 * flows use the query string instead, so we read both.
 */

const configuredScheme = Constants.expoConfig?.scheme;
export const APP_SCHEME =
  (Array.isArray(configuredScheme) ? configuredScheme[0] : configuredScheme) || 'hustleon';

/** Build a redirect URI the native app can receive, e.g. `hustleon://reset-password`. */
export function appRedirectUri(path: string): string {
  return `${APP_SCHEME}://${path.replace(/^\/+/, '')}`;
}

export interface AuthRedirectParams {
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  error?: string;
}

/** Pull auth params out of an incoming deep link (fragment first, then query). */
export function parseAuthRedirect(url: string): AuthRedirectParams {
  const collected = new URLSearchParams();

  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    for (const [k, v] of new URLSearchParams(url.slice(hashIndex + 1))) collected.set(k, v);
  }

  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    const end = hashIndex >= 0 && hashIndex > queryIndex ? hashIndex : url.length;
    for (const [k, v] of new URLSearchParams(url.slice(queryIndex + 1, end))) {
      if (!collected.has(k)) collected.set(k, v);
    }
  }

  return {
    accessToken: collected.get('access_token') ?? undefined,
    refreshToken: collected.get('refresh_token') ?? undefined,
    type: collected.get('type') ?? undefined,
    error: collected.get('error_description') ?? collected.get('error') ?? undefined,
  };
}
