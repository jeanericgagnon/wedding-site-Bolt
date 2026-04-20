import type { CoordinatorQnaItem, CoordinatorTimelineState } from './coordinatorModePersistence';
import type { CoordinatorTimelineEventLite } from './coordinatorTimelineFocus';
import { getFirstOpenCoordinatorQnaId } from './coordinatorQnaFocus';

export const resolveCoordinatorQnaFocusAfterItemsChange = (
  items: CoordinatorQnaItem[],
  activeQnaId: string | null,
) => {
  if (!activeQnaId) return getFirstOpenCoordinatorQnaId(items);
  const activeItem = items.find((item) => item.id === activeQnaId);
  if (activeItem?.status === 'new') return activeQnaId;
  return getFirstOpenCoordinatorQnaId(items);
};

export const resolveCoordinatorTimelineFocusAfterStateChange = ({
  events,
  timelineState,
  activeTimelineEventId,
}: {
  events: CoordinatorTimelineEventLite[];
  timelineState: Record<string, CoordinatorTimelineState>;
  activeTimelineEventId: string | null;
}) => {
  if (!activeTimelineEventId) return events.find((event) => (timelineState[event.id] || 'up-next') !== 'done')?.id ?? null;
  const activeState = timelineState[activeTimelineEventId] || 'up-next';
  if (activeState !== 'done') return activeTimelineEventId;
  return events.find((event) => (timelineState[event.id] || 'up-next') !== 'done')?.id ?? null;
};
