import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { appRedirectUri, parseAuthRedirect } from '../lib/links';
import { captureError } from '../lib/monitoring';

interface SignInResult {
  error: string | null;
}

interface SignUpResult {
  error: string | null;
  // True when the account was created but a session was NOT issued
  // (i.e. email confirmation is required before the user can log in).
  needsConfirmation: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, name: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  deleteAccount: () => Promise<{ error: string | null }>;
  /** True while the user has arrived via a password-reset link and must set a new password. */
  passwordRecovery: boolean;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  cancelPasswordRecovery: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: 'Auth not ready' }),
  signUp: async () => ({ error: 'Auth not ready', needsConfirmation: false }),
  signOut: async () => {},
  resetPassword: async () => ({ error: 'Auth not ready' }),
  deleteAccount: async () => ({ error: 'Auth not ready' }),
  passwordRecovery: false,
  updatePassword: async () => ({ error: 'Auth not ready' }),
  cancelPasswordRecovery: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // Restore any persisted session on launch.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep React state in sync with auth events (login, logout, token refresh).
    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
    });

    // Handle auth deep links. The reset-password email redirects back into the
    // app with the recovery session in the URL fragment; without this the link
    // opened the app and did nothing.
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const { accessToken, refreshToken, type, error } = parseAuthRedirect(url);
      if (error) {
        captureError(new Error(`Auth redirect error: ${error}`), { scope: 'auth-deep-link' });
        return;
      }
      if (!accessToken || !refreshToken) return;
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        captureError(sessionError, { scope: 'auth-deep-link' });
        return;
      }
      if (type === 'recovery') setPasswordRecovery(true);
    };

    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const linkListener = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(() => {});
    });

    // Supabase needs auto-refresh tied to app foreground/background in React Native.
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    supabase.auth.startAutoRefresh();

    return () => {
      authListener.subscription.unsubscribe();
      appStateListener.remove();
      linkListener.remove();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string
  ): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    return {
      error: error?.message ?? null,
      needsConfirmation: !error && !data.session,
    };
  };

  const signOut = async (): Promise<void> => {
    // Clear the device-local cache so the next user on this device doesn't
    // inherit the previous user's data (data is already cloud-backed via sync).
    await useStore.getState().clearLocalData();
    setPasswordRecovery(false);
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error as string };
    // clearLocalData() also removes the AI chat history.
    await useStore.getState().clearLocalData();
    await supabase.auth.signOut();
    return { error: null };
  };

  const updatePassword = async (password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    setPasswordRecovery(false);
    return { error: null };
  };

  /** Bail out of a reset flow without changing the password. */
  const cancelPasswordRecovery = async (): Promise<void> => {
    setPasswordRecovery(false);
    // The recovery link signed us in; don't leave that session behind.
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    // Without an explicit redirect the emailed link lands on Supabase's default
    // Site URL, which goes nowhere from a native app. `hustleon://` is the scheme
    // declared in app.config.js.
    //
    // Note: the redirect must also be listed under Supabase Auth → URL
    // Configuration → Redirect URLs, or it is ignored.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: appRedirectUri('reset-password'),
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        deleteAccount,
        passwordRecovery,
        updatePassword,
        cancelPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
