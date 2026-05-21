import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BuilderSectionInstance } from '../../types/builder/section';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { BuilderContext, initialBuilderState } from '../state/builderStore';
import { BuilderSectionFrame } from './BuilderSectionFrame';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

function makeSection(overrides?: Partial<BuilderSectionInstance>): BuilderSectionInstance {
  return {
    id: 'travel-section',
    type: 'travel',
    variant: 'default',
    enabled: true,
    locked: false,
    orderIndex: 0,
    settings: {},
    bindings: {},
    styleOverrides: {},
    meta: {
      createdAtISO: '2026-01-01T00:00:00.000Z',
      updatedAtISO: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

function renderFrame(section: BuilderSectionInstance, sections: BuilderSectionInstance[], existingPageSlugs: string[] = []) {
  const project = createEmptyBuilderProject('wedding-1', 'modern-luxe');
  project.pages[0] = {
    ...project.pages[0],
    id: 'home',
    sections,
  };
  existingPageSlugs.forEach((slug, index) => {
    project.pages.push({
      id: slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      slug,
      orderIndex: index + 1,
      sections: [],
      meta: { isHome: false, isHidden: false },
    });
  });
  const dispatch = vi.fn();

  render(
    <BuilderContext.Provider
      value={{
        state: {
          ...initialBuilderState,
          project,
          activePageId: 'home',
          selectedSectionId: section.id,
        },
        dispatch,
        activePage: project.pages[0],
        selectedSection: section,
        publicSiteSlug: 'maya-leo',
      }}
    >
      <BuilderSectionFrame
        section={section}
        pageId="home"
        isSelected
        isHovered={false}
      >
        <div>Section content</div>
      </BuilderSectionFrame>
    </BuilderContext.Provider>,
  );

  return dispatch;
}

describe('BuilderSectionFrame', () => {
  it('dispatches make-dedicated-page when the page action is clicked', () => {
    const section = makeSection();
    const sibling = makeSection({ id: 'story-section', type: 'story', orderIndex: 1 });
    const dispatch = renderFrame(section, [section, sibling]);

    expect(screen.getByText('/travel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Move Travel & Hotels to a dedicated page' }));

    expect(dispatch).toHaveBeenCalledWith({
      type: 'CREATE_PAGE_FROM_SECTION',
      payload: {
        pageId: 'home',
        sectionId: 'travel-section',
        title: 'Travel',
      },
    });
  });

  it('hides the dedicated page action when it would empty the source page', () => {
    const section = makeSection();
    renderFrame(section, [section]);

    expect(screen.queryByRole('button', { name: 'Move Travel & Hotels to a dedicated page' })).not.toBeInTheDocument();
  });

  it('uses a custom section title when creating a dedicated page', () => {
    const section = makeSection({ settings: { title: 'Guest Travel' } });
    const sibling = makeSection({ id: 'story-section', type: 'story', orderIndex: 1 });
    const dispatch = renderFrame(section, [section, sibling]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Travel & Hotels to a dedicated page' }));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        title: 'Guest Travel',
      }),
    }));
  });

  it('uses user-edited title values when creating a dedicated page', () => {
    const section = makeSection({ settings: { title: { value: 'Weekend Travel', userEdited: true } } });
    const sibling = makeSection({ id: 'story-section', type: 'story', orderIndex: 1 });
    const dispatch = renderFrame(section, [section, sibling]);

    fireEvent.click(screen.getByRole('button', { name: 'Move Travel & Hotels to a dedicated page' }));

    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        title: 'Weekend Travel',
      }),
    }));
  });

  it('previews a unique route when a matching page already exists', () => {
    const section = makeSection();
    const sibling = makeSection({ id: 'story-section', type: 'story', orderIndex: 1 });
    renderFrame(section, [section, sibling], ['travel']);

    expect(screen.getByText('/travel-2')).toBeInTheDocument();
  });
});
