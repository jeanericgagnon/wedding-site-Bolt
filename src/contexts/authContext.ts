import { createContext } from 'react';

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

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const DEMO_EMAIL = 'demo@dayof.love';
