import { getSectionManifest } from '../builder/registry/sectionManifests';
import type { BuilderSectionInstance } from '../types/builder/section';
import type { PublicSectionDTO } from '../lib/publicRenderContract';
import {
  normalizePublicSectionAnchorId,
  type PublicSiteSectionAnchorNavItem,
} from './siteViewPageSelection';

type GuestRenderableSection =
  | Pick<BuilderSectionInstance, 'id' | 'type' | 'variant' | 'enabled' | 'orderIndex' | 'settings' | 'bindings' | 'styleOverrides'>
  | PublicSectionDTO;

function getComparablePublicSectionOrderIndex(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function getPublicSectionAnchorNavItems(sections: GuestRenderableSection[]): PublicSiteSectionAnchorNavItem[] {
  return sections
    .filter((section) => section.enabled !== false)
    .map((section, index) => {
      const anchorId = normalizePublicSectionAnchorId(section.settings?.anchorId);
      if (!anchorId) return null;
      const title = (() => {
        try {
          return getSectionManifest(section.type as BuilderSectionInstance['type']).label;
        } catch {
          return anchorId.replace(/-/g, ' ');
        }
      })();
      return {
        id: section.id,
        anchorId,
        title,
        orderIndex: getComparablePublicSectionOrderIndex(section.orderIndex, index),
      };
    })
    .filter((item): item is PublicSiteSectionAnchorNavItem => Boolean(item))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}
