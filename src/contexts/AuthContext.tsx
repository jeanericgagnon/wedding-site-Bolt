import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEMO_MODE, SUPABASE_CONFIGURED } from '../config/env';
import { clearLocalDemoAuthFlag, readLocalDemoAuthFlag, writeLocalDemoAuthFlag } from './localDemoAuthStorage';
import {
  clearLocalE2EBypassFlag,
  LOCAL_E2E_AUTH_KEY,
  readLocalE2EBypassFlag,
} from '../lib/localE2EBypassStorage';

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

function canUseE2EAuthBypass(): boolean {
  return readLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const shouldUseLocalE2EBypass = canUseE2EAuthBypass();
    const shouldUseLocalDemo = DEMO_MODE && readLocalDemoAuthFlag();

    if (shouldUseLocalE2EBypass) {
      setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
      setLoading(false);
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      if (shouldUseLocalDemo) {
        setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          clearLocalDemoAuthFlag();
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email || '',
          });
        } else if (shouldUseLocalDemo) {
          setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
        }
      })
      .catch(() => {
        if (shouldUseLocalDemo) {
          setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
        }
      })
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        clearLocalDemoAuthFlag();
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || '',
        });
      } else if ((DEMO_MODE && readLocalDemoAuthFlag()) || canUseE2EAuthBypass()) {
        setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setLocalDemoUser = () => {
    writeLocalDemoAuthFlag();
    setUser({ id: 'demo-local-user', email: DEMO_EMAIL, name: 'Alex & Jordan (Demo)' });
  };

  const signIn = async () => {
    if (!DEMO_MODE) {
      if (!SUPABASE_CONFIGURED) {
        throw new Error('DayOf is still being connected. Please try again shortly.');
      }
      throw new Error('Demo mode is not enabled. Please use regular sign in.');
    }

    // In demo mode, always use local auth to avoid backend dependency/noise.
    setLocalDemoUser();
  };

  const signOut = async () => {
    clearLocalDemoAuthFlag();
    clearLocalE2EBypassFlag(LOCAL_E2E_AUTH_KEY);
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
