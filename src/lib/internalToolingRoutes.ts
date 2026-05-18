import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isAdminUser } from './adminUsers';

export function isInternalToolingRouteFlagEnabled(
  value = import.meta.env.VITE_ENABLE_INTERNAL_TOOLING_ROUTES,
  dev = import.meta.env.DEV,
): boolean {
  if (dev) return true;
  if (typeof window !== 'undefined' && /\.vercel\.app$/i.test(window.location.hostname)) return true;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export function canAccessInternalToolingRoutes(flagEnabled: boolean, isAdmin: boolean): boolean {
  return flagEnabled && isAdmin;
}

export function useInternalToolingRouteAccess(): {
  internalToolingRoutesEnabled: boolean;
  internalToolingCaptureRoutesEnabled: boolean;
  internalToolingRoutesLoading: boolean;
  internalToolingRouteFlagEnabled: boolean;
} {
  const { user, loading, isDemoMode } = useAuth();
  const flagEnabled = isInternalToolingRouteFlagEnabled();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!flagEnabled || loading) {
      setAdminLoading(flagEnabled && loading);
      if (!loading) setIsAdmin(false);
      return () => {
        mounted = false;
      };
    }

    if (!user?.id || isDemoMode) {
      setIsAdmin(false);
      setAdminLoading(false);
      return () => {
        mounted = false;
      };
    }

    setAdminLoading(true);
    isAdminUser(user.id)
      .then((next) => {
        if (!mounted) return;
        setIsAdmin(next);
      })
      .catch(() => {
        if (!mounted) return;
        setIsAdmin(false);
      })
      .finally(() => {
        if (!mounted) return;
        setAdminLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [flagEnabled, isDemoMode, loading, user?.id]);

  return {
    internalToolingRoutesEnabled: canAccessInternalToolingRoutes(flagEnabled, isAdmin),
    internalToolingCaptureRoutesEnabled: flagEnabled,
    internalToolingRoutesLoading: flagEnabled && (loading || adminLoading),
    internalToolingRouteFlagEnabled: flagEnabled,
  };
}
