import { BuilderSectionType } from './section';

export type TemplateMoodTag =
  | 'romantic'
  | 'modern'
  | 'minimal'
  | 'editorial'
  | 'classic'
  | 'destination'
  | 'floral'
  | 'luxe'
  | 'garden'
  | 'bold'
  | 'photo';

export interface TemplateSectionSlot {
  type: BuilderSectionType;
  variant: string;
  enabled: boolean;
  locked: boolean;
  settings: Record<string, string | boolean | number | undefined>;
}

export interface BuilderTemplateDefinition {
  id: string;
  displayName: string;
  description: string;
  moodTags: TemplateMoodTag[];
  previewThumbnailPath: string;
  defaultThemeId: string;
  sectionComposition: TemplateSectionSlot[];
  sectionVariantMap: Record<string, string>;
  suggestedFonts: {
    heading: string;
    body: string;
  };
  spacingProfile: 'compact' | 'balanced' | 'spacious';
  isNew?: boolean;
  isPremium?: boolean;
}
