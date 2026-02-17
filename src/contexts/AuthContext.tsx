import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_MODE, SUPABASE_CONFIGURED } from '../config/env';
import { AuthContext, AuthUser, DEMO_EMAIL } from './authContext';

const DEMO_PASSWORD = 'demo-password-12345';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
