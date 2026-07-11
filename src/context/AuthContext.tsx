import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

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
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore any persisted session on launch.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Keep React state in sync with auth events (login, logout, token refresh).
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
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
    await supabase.auth.signOut();
  };

  const deleteAccount = async (): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) return { error: error.message };
    if (data?.error) return { error: data.error as string };
    // Wipe local cache + chat history, then sign out.
    await useStore.getState().clearLocalData();
    try {
      await AsyncStorage.removeItem('@hustleon:ai_chat');
    } catch {
      // best-effort
    }
    await supabase.auth.signOut();
    return { error: null };
  };

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
