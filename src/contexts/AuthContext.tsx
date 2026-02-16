import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_MODE, SUPABASE_CONFIGURED } from '../config/env';
import type { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_EMAIL = 'demo@dayof.love';
const DEMO_PASSWORD = 'demo-password-12345';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
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

    // Listen for auth changes
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
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
