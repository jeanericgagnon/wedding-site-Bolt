import type { CoordinatorQnaItem } from './coordinatorModePersistence';

export type CoordinatorQnaBoard = {
  statusLabel: string;
  tone: 'ready' | 'warning' | 'neutral';
  activeLabel: string;
  nextLabel: string;
  backlogLabel: string;
  draftLabel: string;
};

export const buildCoordinatorQnaBoard = ({
  items,
  activeItem,
  activeDraftStateLabel,
}: {
  items: CoordinatorQnaItem[];
  activeItem: CoordinatorQnaItem | null;
  activeDraftStateLabel: string;
}): CoordinatorQnaBoard => {
  const openItems = items.filter((item) => item.status === 'new');
  const answeredCount = items.length - openItems.length;
  const nextOpenItem = openItems.find((item) => item.id !== activeItem?.id) ?? null;

  return {
    statusLabel: activeItem
      ? activeItem.status === 'answered'
        ? 'Focused reply is covered'
        : 'Focused reply needs send-ready copy'
      : openItems.length > 0
        ? 'Open guest questions need attention'
        : 'Guest Q&A is clear',
    tone: activeItem
      ? activeItem.status === 'answered' && activeDraftStateLabel === 'Answer saved'
        ? 'ready'
        : 'warning'
      : openItems.length > 0
        ? 'warning'
        : 'neutral',
    activeLabel: activeItem ? activeItem.question : 'No focused guest question',
    nextLabel: nextOpenItem ? nextOpenItem.question : 'No other open questions queued',
    backlogLabel: `${openItems.length} open · ${answeredCount} answered`,
    draftLabel: activeItem ? activeDraftStateLabel : 'No focused draft',
  };
};
