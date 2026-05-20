import { describe, expect, it } from 'vitest';
import { createEmptyBuilderProject } from '../../types/builder/project';
import { createDefaultSectionInstance } from '../../types/builder/section';
import { findBuilderSectionTargetByType, shouldFocusTravelSectionFromSearch } from './builderRouteState';

describe('builderRouteState', () => {
  it('detects travel tool routes from querystring', () => {
    expect(shouldFocusTravelSectionFromSearch('?tool=travel')).toBe(true);
    expect(shouldFocusTravelSectionFromSearch('?tool=hotel-block')).toBe(true);
    expect(shouldFocusTravelSectionFromSearch('?tool=share')).toBe(false);
  });

  it('finds the first matching section target in the project', () => {
    const project = createEmptyBuilderProject('site-1', 'modern-luxe');
    const pageId = project.pages[0].id;
    project.pages[0].sections = [
      createDefaultSectionInstance('hero', undefined, 0),
      createDefaultSectionInstance('travel', undefined, 1),
    ];

    expect(findBuilderSectionTargetByType(project, 'travel')).toEqual({
      pageId,
      sectionId: project.pages[0].sections[1].id,
    });
  });
});
