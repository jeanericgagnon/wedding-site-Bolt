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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || '',
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || '',
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    if (!DEMO_MODE) {
      if (!SUPABASE_CONFIGURED) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }
      throw new Error('Demo mode is not enabled. Please use regular sign in.');
    }

    if (!SUPABASE_CONFIGURED) {
      setUser({
        id: 'demo-local-user',
        email: DEMO_EMAIL,
        name: 'Alex & Jordan (Demo)',
      });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });

    if (error) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: {
          data: {
            name: 'Alex & Jordan (Demo)',
          },
        },
      });

      if (signUpError) {
        throw new Error('Unable to access demo account. Please try again.');
      }

      if (signUpData.user) {
        setUser({
          id: signUpData.user.id,
          email: signUpData.user.email || '',
          name: 'Alex & Jordan (Demo)',
        });
      }
    } else if (data.user) {
      setUser({
        id: data.user.id,
        email: data.user.email || '',
        name: 'Alex & Jordan (Demo)',
      });
    }
  };

  const signOut = async () => {
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
