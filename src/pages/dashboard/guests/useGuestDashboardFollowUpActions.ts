import type { Dispatch, SetStateAction } from 'react';

import { buildFollowUpTask, buildGeneratedFollowUpTasks, buildSavedSegment } from './guestDashboardUtils';
import type { RsvpCampaignPreset, RsvpFollowUpTask, RsvpSavedSegment } from './guestDashboardStorage';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info') => void;

interface UseGuestDashboardFollowUpActionsInput {
  contactStats: Parameters<typeof buildGeneratedFollowUpTasks>[0]['contactStats'];
  filterStatus: string;
  filteredGuestCount: number;
  rsvpOps: Parameters<typeof buildGeneratedFollowUpTasks>[0]['rsvpOps'];
  segmentLabel: string;
  setFollowUpTasks: Dispatch<SetStateAction<RsvpFollowUpTask[]>>;
  setSavedSegments: Dispatch<SetStateAction<RsvpSavedSegment[]>>;
  toast: ToastFn;
}

export function useGuestDashboardFollowUpActions({
  contactStats,
  filterStatus,
  filteredGuestCount,
  rsvpOps,
  segmentLabel,
  setFollowUpTasks,
  setSavedSegments,
  toast,
}: UseGuestDashboardFollowUpActionsInput) {
  const saveCurrentSegment = () => {
    const segment = buildSavedSegment({
      now: new Date(),
      filterStatus,
      segmentLabel,
      guestCount: filteredGuestCount,
    });
    setSavedSegments((prev) => [segment, ...prev.filter((entry) => entry.filter !== filterStatus)].slice(0, 12));
    toast('Segment saved', 'success');
  };

  const addFollowUpTask = (text: string) => {
    const task = buildFollowUpTask({ now: new Date(), text });
    setFollowUpTasks((prev) => [task, ...prev].slice(0, 6));
    toast('Follow-up task captured', 'success');
  };

  const generateChecklistTasks = () => {
    const tasks = buildGeneratedFollowUpTasks({ now: new Date(), rsvpOps, contactStats });

    if (tasks.length === 0) {
      toast('No blockers right now. Great shape!', 'success');
      return;
    }

    setFollowUpTasks((prev) => [...tasks, ...prev].slice(0, 12));
    toast(`Created ${tasks.length} follow-up task${tasks.length === 1 ? '' : 's'}`, 'success');
  };

  return {
    addFollowUpTask,
    generateChecklistTasks,
    saveCurrentSegment,
  };
}
