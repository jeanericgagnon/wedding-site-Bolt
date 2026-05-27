import { builderActions } from '../state/builderActions';
import type { BuilderPageEditingAction } from './builderPageEditingSummary';

interface BuilderPageEditingActionOptions {
  action: BuilderPageEditingAction;
  activePageId: string;
  dispatch: (action: ReturnType<(typeof builderActions)[keyof typeof builderActions]>) => void;
  revealInspector?: () => void;
  afterAction?: () => void;
}

export function scrollBuilderSectionIntoView(sectionId: string) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

export function runBuilderPageEditingAction({
  action,
  activePageId,
  dispatch,
  revealInspector,
  afterAction,
}: BuilderPageEditingActionOptions) {
  dispatch(builderActions.setActivePage(activePageId));

  switch (action.kind) {
    case 'add-section':
      dispatch(builderActions.addSectionByType(activePageId, action.sectionType));
      afterAction?.();
      return;
    case 'add-essential-kit':
      action.sectionTypes.forEach((sectionType) => {
        dispatch(builderActions.addSectionByType(activePageId, sectionType));
      });
      afterAction?.();
      return;
    case 'select-section':
      dispatch(builderActions.selectSection(action.sectionId));
      revealInspector?.();
      scrollBuilderSectionIntoView(action.sectionId);
      afterAction?.();
      return;
    case 'open-template-gallery':
      dispatch(builderActions.selectSection(null));
      dispatch(builderActions.openTemplateGallery());
      afterAction?.();
      return;
    default:
      return;
  }
}
