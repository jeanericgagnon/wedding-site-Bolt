import { BuilderSectionType } from '../../types/builder/section';
import { getSectionComponent, getSectionVariants, SectionComponent } from '../../sections/sectionRegistry';

export function getSectionRenderer(type: BuilderSectionType, variant = 'default'): SectionComponent {
  return getSectionComponent(type, variant);
}

export function getSectionVariantsList(type: BuilderSectionType): string[] {
  return getSectionVariants(type);
}
