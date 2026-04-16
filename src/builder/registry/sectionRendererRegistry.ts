import { BuilderSectionType } from '../../types/builder/section';
import { getSectionComponent, SectionComponent } from '../../sections/sectionRegistry';
import { SECTION_MANIFESTS } from './sectionManifests';

export function getSectionRenderer(type: BuilderSectionType, variant = 'default'): SectionComponent {
  return getSectionComponent(type, variant);
}

export function getSectionVariantsList(type: BuilderSectionType): string[] {
  return SECTION_MANIFESTS[type]?.supportedVariants ?? ['default'];
}
