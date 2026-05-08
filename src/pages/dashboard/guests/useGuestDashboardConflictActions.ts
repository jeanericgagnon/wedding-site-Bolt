import { useCallback, useMemo, useState } from 'react';
import { getGuestOpsTimestamp } from '../guestOpsTime';
import type { RsvpConflict, RsvpConflictStats } from './guestDashboardTypes';
import { resolveGuestDashboardConflict, resolveGuestDashboardConflicts } from './guestService';

type ToastFn = (message: string, tone?: 'success' | 'error' | 'warning') => void;

type UseGuestDashboardConflictActionsArgs = {
  conflictFilter: 'all' | 'error' | 'warning';
  isDemoMode: boolean;
  rsvpConflictHistory: RsvpConflict[];
  rsvpConflicts: RsvpConflict[];
  setRsvpConflictHistory: React.Dispatch<React.SetStateAction<RsvpConflict[]>>;
  setRsvpConflicts: React.Dispatch<React.SetStateAction<RsvpConflict[]>>;
  toast: ToastFn;
};

export function useGuestDashboardConflictActions({
  conflictFilter,
  isDemoMode,
  rsvpConflictHistory,
  rsvpConflicts,
  setRsvpConflictHistory,
  setRsvpConflicts,
  toast,
}: UseGuestDashboardConflictActionsArgs) {
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);

  const visibleRsvpConflicts = useMemo(
    () => rsvpConflicts.filter((conflict) => (conflictFilter === 'all' ? true : conflict.severity === conflictFilter)),
    [conflictFilter, rsvpConflicts]
  );

  const rsvpConflictStats = useMemo<RsvpConflictStats>(() => {
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const threeDaysAgo = now - (72 * 60 * 60 * 1000);

    const opened24h = rsvpConflictHistory.filter((conflict) => getGuestOpsTimestamp(conflict.created_at) >= dayAgo).length;
    const resolved24h = rsvpConflictHistory.filter((conflict) => getGuestOpsTimestamp(conflict.resolved_at) >= dayAgo).length;
    const unresolvedOver24h = rsvpConflicts.filter((conflict) => getGuestOpsTimestamp(conflict.created_at) < dayAgo).length;
    const unresolvedOver72h = rsvpConflicts.filter((conflict) => getGuestOpsTimestamp(conflict.created_at) < threeDaysAgo).length;

    const codeCounts = new Map<string, number>();
    for (const conflict of rsvpConflictHistory) {
      codeCounts.set(conflict.conflict_code, (codeCounts.get(conflict.conflict_code) ?? 0) + 1);
    }

    const topCodes = [...codeCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([code, count]) => ({ code, count }));

    return {
      openNow: rsvpConflicts.length,
      opened24h,
      resolved24h,
      unresolvedOver24h,
      unresolvedOver72h,
      topCodes,
    };
  }, [rsvpConflictHistory, rsvpConflicts]);

  const resolveConflict = useCallback(async (conflictId: string) => {
    setResolvingConflictId(conflictId);
    try {
      if (isDemoMode) {
        setRsvpConflicts((prev) => prev.filter((conflict) => conflict.id !== conflictId));
        setRsvpConflictHistory((prev) =>
          prev.map((conflict) => (conflict.id === conflictId ? { ...conflict, resolved: true, resolved_at: new Date().toISOString() } : conflict))
        );
        return;
      }

      const resolvedAt = new Date().toISOString();
      await resolveGuestDashboardConflict(conflictId, resolvedAt);
      setRsvpConflicts((prev) => prev.filter((conflict) => conflict.id !== conflictId));
      setRsvpConflictHistory((prev) =>
        prev.map((conflict) => (conflict.id === conflictId ? { ...conflict, resolved: true, resolved_at: resolvedAt } : conflict))
      );
      toast('RSVP item marked done', 'success');
    } catch {
      toast('Couldn’t mark that RSVP item done.', 'error');
    } finally {
      setResolvingConflictId(null);
    }
  }, [isDemoMode, setRsvpConflictHistory, setRsvpConflicts, toast]);

  const resolveAllVisibleConflicts = useCallback(async () => {
    if (visibleRsvpConflicts.length === 0) return;

    setResolvingConflictId('all');
    try {
      const ids = visibleRsvpConflicts.map((conflict) => conflict.id);
      const resolvedAt = new Date().toISOString();

      if (!isDemoMode) {
        await resolveGuestDashboardConflicts(ids, resolvedAt);
      }

      setRsvpConflictHistory((prev) =>
        prev.map((conflict) => (ids.includes(conflict.id) ? { ...conflict, resolved: true, resolved_at: resolvedAt } : conflict))
      );
      setRsvpConflicts((prev) => prev.filter((conflict) => !ids.includes(conflict.id)));
      toast(`${ids.length} RSVP item${ids.length === 1 ? '' : 's'} marked done`, 'success');
    } catch {
      toast('Couldn’t mark those RSVP items done.', 'error');
    } finally {
      setResolvingConflictId(null);
    }
  }, [isDemoMode, setRsvpConflictHistory, setRsvpConflicts, toast, visibleRsvpConflicts]);

  return {
    resolveAllVisibleConflicts,
    resolveConflict,
    resolvingConflictId,
    rsvpConflictStats,
    visibleRsvpConflicts,
  };
}
