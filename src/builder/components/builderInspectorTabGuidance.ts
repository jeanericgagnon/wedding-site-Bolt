type InspectorTab = 'guide' | 'content' | 'style' | 'layout' | 'data';

export type BuilderInspectorLaneStatus = 'done' | 'recommended' | 'pending' | 'optional' | 'blocked';

export interface BuilderInspectorTabGuidanceItem {
  id: Exclude<InspectorTab, 'guide'>;
  label: string;
  status: BuilderInspectorLaneStatus;
  badge: string;
  summary: string;
  detail: string;
  show: boolean;
}

interface BuilderInspectorTabGuidanceInput {
  sectionLabel: string;
  hasContentControls?: boolean;
  hasMeaningfulContent: boolean;
  hasStyleOverrides: boolean;
  hasLayoutCustomization: boolean;
  hasBindings: boolean;
  dataConfigured: boolean;
  enabled: boolean;
  recommendedTab: InspectorTab;
}

const asRecommended = (recommendedTab: InspectorTab, tab: Exclude<InspectorTab, 'guide'>) =>
  recommendedTab === tab;

export function getBuilderInspectorTabGuidance({
  sectionLabel,
  hasContentControls = true,
  hasMeaningfulContent,
  hasStyleOverrides,
  hasLayoutCustomization,
  hasBindings,
  dataConfigured,
  enabled,
  recommendedTab,
}: BuilderInspectorTabGuidanceInput): BuilderInspectorTabGuidanceItem[] {
  const contentStatus: BuilderInspectorLaneStatus = !enabled
    ? 'blocked'
    : !hasMeaningfulContent
      ? asRecommended(recommendedTab, 'content') ? 'recommended' : 'pending'
      : 'done';
  const layoutStatus: BuilderInspectorLaneStatus = !enabled
    ? asRecommended(recommendedTab, 'layout') ? 'recommended' : 'blocked'
    : !hasLayoutCustomization
      ? asRecommended(recommendedTab, 'layout') ? 'recommended' : 'pending'
      : 'done';
  const dataStatus: BuilderInspectorLaneStatus = !hasBindings
    ? 'optional'
    : !enabled
      ? 'blocked'
      : !dataConfigured
        ? asRecommended(recommendedTab, 'data') ? 'recommended' : 'pending'
        : 'done';
  const styleStatus: BuilderInspectorLaneStatus = !enabled
    ? 'blocked'
    : !hasMeaningfulContent || !hasLayoutCustomization || (hasBindings && !dataConfigured)
      ? 'pending'
      : !hasStyleOverrides
        ? asRecommended(recommendedTab, 'style') ? 'recommended' : 'optional'
        : 'done';

  return [
    {
      id: 'content',
      label: 'Content',
      status: contentStatus,
      badge: contentStatus === 'done' ? 'Ready' : contentStatus === 'recommended' ? 'Do now' : contentStatus === 'blocked' ? 'Hidden' : 'Next',
      summary: !enabled
        ? `${sectionLabel} is hidden, so content edits are secondary right now.`
        : hasMeaningfulContent
          ? 'The core guest-facing copy is in place.'
          : 'This section still needs the real text or details guests should actually read.',
      detail: !enabled
        ? 'Decide whether this section belongs on the page again before you spend time editing it.'
        : hasMeaningfulContent
          ? 'Use this lane when the message itself needs a direct correction.'
          : 'Start here when the section still feels like structure without substance.',
      show: hasContentControls,
    },
    {
      id: 'layout',
      label: 'Layout',
      status: layoutStatus,
      badge: layoutStatus === 'done' ? 'Ready' : layoutStatus === 'recommended' ? 'Do now' : layoutStatus === 'blocked' ? 'Hidden' : 'Next',
      summary: !enabled
        ? 'Visibility is the first layout decision right now.'
        : hasLayoutCustomization
          ? 'The section already has a deliberate structure.'
          : 'The content needs a better layout, spacing, or variant decision.',
      detail: !enabled
        ? 'Show the section again if it still belongs, then use layout to make it readable.'
        : hasLayoutCustomization
          ? 'Come back here if preview reveals that the section rhythm still feels off.'
          : 'This lane is for choosing the variant and spacing that makes the content easiest to trust.',
      show: true,
    },
    {
      id: 'style',
      label: 'Style',
      status: styleStatus,
      badge: styleStatus === 'done' ? 'Set' : styleStatus === 'recommended' ? 'Review' : styleStatus === 'optional' ? 'Usually skip' : styleStatus === 'blocked' ? 'Hidden' : 'Later',
      summary: !enabled
        ? 'Section-level styling can wait until the section is part of the visible page again.'
        : hasStyleOverrides
          ? 'This section already has custom visual treatment.'
          : 'The default site styling may already be enough here.',
      detail: !enabled
        ? 'Do not spend time styling a section guests cannot see.'
        : hasStyleOverrides
          ? 'Use this lane to simplify or correct styling only if the section still clashes in context.'
          : 'Treat this lane as a restraint check, not an automatic customization step.',
      show: true,
    },
    {
      id: 'data',
      label: 'Data',
      status: dataStatus,
      badge: dataStatus === 'done' ? 'Connected' : dataStatus === 'recommended' ? 'Connect now' : dataStatus === 'optional' ? 'Not needed' : dataStatus === 'blocked' ? 'Hidden' : 'Pending',
      summary: !hasBindings
        ? 'This section does not depend on structured dashboard data.'
        : !enabled
          ? 'Connected data matters only if this section returns to the page.'
          : dataConfigured
            ? 'The section is already pulling the structured data it depends on.'
            : 'This section still needs its real schedule, venue, FAQ, registry, or media source.',
      detail: !hasBindings
        ? 'You can ignore this lane for sections that stand on their own content.'
        : !enabled
          ? 'Reconnect only after you know the section still belongs in the page flow.'
          : dataConfigured
            ? 'Use this lane if the source needs to change, not for ordinary copy polish.'
            : 'Treat disconnected structured content as a trust problem, not just a missing setting.',
      show: hasBindings,
    },
  ];
}
