import { getTemplate } from '../templates/registry';
import { createInitialBuilderV2Pages, type LabPage, type LabSection } from './builderV2PageState';

export type BuilderV2TemplateSeed = {
  templateId: string;
  templateName: string;
  pages: LabPage[];
  selectedPageId: string;
  selectedSectionId: string;
};

type BuilderV2TemplateSeedOptions = {
  density?: LabSection['density'];
  sectionTitle?: (type: string) => string;
  sectionSubtitle?: (type: string) => string;
};

const titleCaseWords = (value: string) => value
  .split(/[-\s]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ');

export const getBuilderV2TemplateSectionTitle = (type: string) => {
  switch (type) {
    case 'footer-cta':
      return 'Closing CTA';
    case 'rsvp':
      return 'RSVP';
    case 'faq':
      return 'FAQ';
    default:
      return titleCaseWords(type);
  }
};

export const getBuilderV2TemplateSectionSubtitle = (type: string) => {
  switch (type) {
    case 'hero':
      return 'The couple · Wedding day';
    case 'story':
      return 'How it all started';
    case 'schedule':
      return 'Weekend events';
    case 'travel':
    case 'accommodations':
      return 'Stay + transport';
    case 'registry':
      return 'Gift options';
    case 'rsvp':
      return 'Let us know';
    case 'faq':
      return 'Helpful details';
    case 'venue':
      return 'Where we are gathering';
    case 'countdown':
      return 'Save the date';
    case 'wedding-party':
      return 'The people standing with us';
    case 'dress-code':
      return 'What to wear';
    case 'contact':
      return 'Questions before the weekend';
    case 'directions':
      return 'Getting there';
    case 'footer-cta':
      return 'Final planning nudge';
    case 'gallery':
      return 'Favorite moments';
    case 'quotes':
      return 'Words from the people we love';
    case 'menu':
      return 'Celebration menu';
    case 'music':
      return 'Weekend soundtrack';
    case 'video':
      return 'Films + clips';
    default:
      return titleCaseWords(type);
  }
};

export const buildBuilderV2TemplateSeed = (
  templateId: unknown,
  options: BuilderV2TemplateSeedOptions = {},
): BuilderV2TemplateSeed => {
  const template = getTemplate(templateId);
  const sectionTitle = options.sectionTitle ?? getBuilderV2TemplateSectionTitle;
  const sectionSubtitle = options.sectionSubtitle ?? getBuilderV2TemplateSectionSubtitle;
  const density = options.density ?? 'comfortable';

  const sections: LabSection[] = template.defaultLayout.sections.map((section, index) => ({
    id: `${String(section.type).replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'section'}-${index + 1}`,
    type: String(section.type),
    title: sectionTitle(String(section.type)),
    subtitle: sectionSubtitle(String(section.type)),
    variant: section.variant || 'default',
    enabled: section.enabled !== false,
    density,
  }));

  const pages = createInitialBuilderV2Pages(sections);

  return {
    templateId: template.id,
    templateName: template.name,
    pages,
    selectedPageId: pages[0]?.id ?? 'home',
    selectedSectionId: sections[0]?.id ?? 'hero-1',
  };
};
