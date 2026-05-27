import { describe, expect, it } from 'vitest';
import { getBuilderWorkbenchGuidance } from './builderWorkbenchGuidance';

describe('getBuilderWorkbenchGuidance', () => {
  it('treats preview mode as a guest-trust pass', () => {
    const guidance = getBuilderWorkbenchGuidance({
      activePageTitle: 'Home',
      sectionCount: 6,
      selectedSectionLabel: 'Hero',
      mode: 'preview',
      inspectorHidden: false,
      isDirty: false,
    });

    expect(guidance.badge).toBe('Previewing guest flow');
    expect(guidance.primaryAction).toEqual({
      kind: 'switch-to-edit',
      label: 'Back to edit mode',
    });
  });

  it('steers blank pages toward first structure instead of drift', () => {
    const guidance = getBuilderWorkbenchGuidance({
      activePageTitle: 'Travel',
      sectionCount: 0,
      selectedSectionLabel: null,
      mode: 'edit',
      inspectorHidden: false,
      isDirty: false,
    });

    expect(guidance.heading).toContain('Travel still needs its first real section');
    expect(guidance.checklist[0]?.title).toContain('Pick the anchor section first');
  });

  it('pushes page-level states toward selecting a lead section', () => {
    const guidance = getBuilderWorkbenchGuidance({
      activePageTitle: 'Story',
      sectionCount: 4,
      selectedSectionLabel: null,
      mode: 'edit',
      inspectorHidden: false,
      isDirty: false,
    });

    expect(guidance.primaryAction).toEqual({
      kind: 'select-first-section',
      label: 'Open the first live section',
    });
  });

  it('treats hidden inspector state as the next shell-level blocker', () => {
    const guidance = getBuilderWorkbenchGuidance({
      activePageTitle: 'Home',
      sectionCount: 5,
      selectedSectionLabel: 'Hero',
      mode: 'edit',
      inspectorHidden: true,
      isDirty: false,
    });

    expect(guidance.primaryAction).toEqual({
      kind: 'show-inspector',
      label: 'Show inspector',
    });
    expect(guidance.watchout).toContain('inspector hidden');
  });

  it('treats dirty section work as a save-worthy stabilization point', () => {
    const guidance = getBuilderWorkbenchGuidance({
      activePageTitle: 'FAQ',
      sectionCount: 3,
      selectedSectionLabel: 'FAQ',
      mode: 'edit',
      inspectorHidden: false,
      isDirty: true,
    });

    expect(guidance.primaryAction).toEqual({
      kind: 'save-draft',
      label: 'Save this draft',
    });
  });
});
