import { describe, expect, it, vi, afterEach } from 'vitest';

import { runBuilderPageEditingAction, scrollBuilderSectionIntoView } from './builderPageEditingActions';

describe('runBuilderPageEditingAction', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds every missing essential in one pass for bulk recovery actions', () => {
    const dispatch = vi.fn();

    runBuilderPageEditingAction({
      action: {
        kind: 'add-essential-kit',
        label: 'Add missing essentials (3)',
        sectionTypes: ['story', 'travel', 'faq'],
      },
      activePageId: 'page-1',
      dispatch,
    });

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      'SET_ACTIVE_PAGE',
      'ADD_SECTION_TYPE',
      'ADD_SECTION_TYPE',
      'ADD_SECTION_TYPE',
    ]);
  });

  it('reveals the inspector and scrolls when recovering a hidden section', () => {
    const dispatch = vi.fn();
    const revealInspector = vi.fn();
    const scrollSpy = vi.spyOn(document, 'querySelector').mockReturnValue({
      scrollIntoView: vi.fn(),
    } as unknown as Element);
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    runBuilderPageEditingAction({
      action: {
        kind: 'select-section',
        label: 'Review hidden FAQ',
        sectionId: 'faq-hidden',
      },
      activePageId: 'page-1',
      dispatch,
      revealInspector,
    });

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      'SET_ACTIVE_PAGE',
      'SELECT_SECTION',
    ]);
    expect(revealInspector).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith('[data-section-id="faq-hidden"]');
    expect(rafSpy).toHaveBeenCalled();
  });

  it('opens template comparison without leaving a stale selected section behind', () => {
    const dispatch = vi.fn();

    runBuilderPageEditingAction({
      action: {
        kind: 'open-template-gallery',
        label: 'Compare templates',
      },
      activePageId: 'page-1',
      dispatch,
    });

    expect(dispatch.mock.calls.map(([action]) => action.type)).toEqual([
      'SET_ACTIVE_PAGE',
      'SELECT_SECTION',
      'OPEN_TEMPLATE_GALLERY',
    ]);
  });
});

describe('scrollBuilderSectionIntoView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the section id selector when scrolling to a section', () => {
    const scrollIntoView = vi.fn();
    const querySpy = vi.spyOn(document, 'querySelector').mockReturnValue({
      scrollIntoView,
    } as unknown as Element);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });

    scrollBuilderSectionIntoView('hero-1');

    expect(querySpy).toHaveBeenCalledWith('[data-section-id="hero-1"]');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
