import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_MODE, SUPABASE_CONFIGURED } from '../config/env';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const DEMO_EMAIL = 'demo@dayof.love';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const DEMO_PASSWORD = 'demo-password-12345';
const LOCAL_DEMO_AUTH_KEY = 'dayof_demo_local_auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const shouldUseLocalDemo = DEMO_MODE && localStorage.getItem(LOCAL_DEMO_AUTH_KEY) === '1';

    if (!SUPABASE_CONFIGURED) {
      if (shouldUseLocalDemo) {
        setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || '',
        });
      } else if (shouldUseLocalDemo) {
        setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || '',
        });
      } else if (DEMO_MODE && localStorage.getItem(LOCAL_DEMO_AUTH_KEY) === '1') {
        setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setLocalDemoUser = () => {
    localStorage.setItem(LOCAL_DEMO_AUTH_KEY, '1');
    setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
  };

  const trySupabaseDemoSignIn = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (error || !data.user) return null;
    return data.user;
  };

  const signIn = async () => {
    if (!DEMO_MODE) {
      if (!SUPABASE_CONFIGURED) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }
      throw new Error('Demo mode is not enabled. Please use regular sign in.');
    }

    if (!SUPABASE_CONFIGURED) {
      setLocalDemoUser();
      return;
    }

    const existingUser = await trySupabaseDemoSignIn();
    if (existingUser) {
      localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
      setUser({
        id: existingUser.id,
        email: existingUser.email || '',
        name: existingUser.user_metadata?.name || 'Alex & Jordan (Demo)',
      });
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      options: { data: { name: 'Alex & Jordan (Demo)' } },
    });

    // If sign-up fails (email confirmations/rate-limits/settings), keep demo UX available.
    if (signUpError) {
      setLocalDemoUser();
      return;
    }

    const newUser = await trySupabaseDemoSignIn();
    if (newUser) {
      localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
      setUser({
        id: newUser.id,
        email: newUser.email || '',
        name: newUser.user_metadata?.name || 'Alex & Jordan (Demo)',
      });
      return;
    }

    setLocalDemoUser();
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_DEMO_AUTH_KEY);
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isDemoMode: user?.email === DEMO_EMAIL,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
