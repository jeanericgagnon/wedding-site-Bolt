export type SectionType =
  | 'hero'
  | 'story'
  | 'venue'
  | 'schedule'
  | 'travel'
  | 'registry'
  | 'faq'
  | 'rsvp'
  | 'gallery'
  | 'countdown'
  | 'footer-cta';

export interface SectionSettings {
  [key: string]: string | number | boolean | undefined;
}

export interface SectionBindings {
  [key: string]: string | undefined;
}

export interface Section {
  type: SectionType;
  variant: string;
  enabled: boolean;
  bindings?: SectionBindings;
  settings?: SectionSettings;
}

export interface ThemePreset {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  fontFamily: string;
  fontHeading: string;
}

export interface LayoutConfig {
  sections: Section[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  defaultThemePreset: string;
  defaultLayout: LayoutConfig;
  thumbnail?: string;
}
