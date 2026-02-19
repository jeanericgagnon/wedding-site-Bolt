export interface ThemeTokens {
  colorPrimary: string;
  colorPrimaryHover: string;
  colorPrimaryLight: string;
  colorAccent: string;
  colorAccentHover: string;
  colorAccentLight: string;
  colorSecondary: string;
  colorBackground: string;
  colorSurface: string;
  colorSurfaceSubtle: string;
  colorBorder: string;
  colorTextPrimary: string;
  colorTextSecondary: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  tokens: ThemeTokens;
}

export const THEME_PRESETS: Record<string, ThemePreset> = {
  romantic: {
    id: 'romantic',
    name: 'Romantic',
    description: 'Soft blush pinks and warm roses',
    tokens: {
      colorPrimary: '#C0697B',
      colorPrimaryHover: '#A8576A',
      colorPrimaryLight: '#FAF0F2',
      colorAccent: '#E8A0A0',
      colorAccentHover: '#D48888',
      colorAccentLight: '#FDF5F5',
      colorSecondary: '#C89F56',
      colorBackground: '#FDF6F7',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#FEF8F8',
      colorBorder: '#EDD9DC',
      colorTextPrimary: '#3A1F24',
      colorTextSecondary: '#7A5056',
    },
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    description: 'Charcoal and warm neutrals',
    tokens: {
      colorPrimary: '#2C2C2C',
      colorPrimaryHover: '#1A1A1A',
      colorPrimaryLight: '#F0F0F0',
      colorAccent: '#C89F56',
      colorAccentHover: '#B38D47',
      colorAccentLight: '#FAF5E9',
      colorSecondary: '#888888',
      colorBackground: '#F8F7F5',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F5F4F2',
      colorBorder: '#E0DDD8',
      colorTextPrimary: '#1A1A1A',
      colorTextSecondary: '#6B6B6B',
    },
  },
  garden: {
    id: 'garden',
    name: 'Garden',
    description: 'Fresh sage greens and botanical tones',
    tokens: {
      colorPrimary: '#4A7C59',
      colorPrimaryHover: '#3A6348',
      colorPrimaryLight: '#EBF3ED',
      colorAccent: '#A8C5A0',
      colorAccentHover: '#90B088',
      colorAccentLight: '#F3F9F1',
      colorSecondary: '#C89F56',
      colorBackground: '#F4F7F2',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F7FAF5',
      colorBorder: '#D4E3D0',
      colorTextPrimary: '#1E3425',
      colorTextSecondary: '#4A6650',
    },
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blues and coastal teals',
    tokens: {
      colorPrimary: '#2A5D67',
      colorPrimaryHover: '#234B53',
      colorPrimaryLight: '#E5EDEF',
      colorAccent: '#4DB6C8',
      colorAccentHover: '#3CA3B5',
      colorAccentLight: '#E8F7FA',
      colorSecondary: '#C89F56',
      colorBackground: '#F2F6F8',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F5F9FB',
      colorBorder: '#C8DDE2',
      colorTextPrimary: '#0D2D33',
      colorTextSecondary: '#3A6B74',
    },
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm terracotta and amber tones',
    tokens: {
      colorPrimary: '#C06B3A',
      colorPrimaryHover: '#A85930',
      colorPrimaryLight: '#FAF0E9',
      colorAccent: '#E8A860',
      colorAccentHover: '#D49548',
      colorAccentLight: '#FEF6EC',
      colorSecondary: '#8B7355',
      colorBackground: '#FAF5F0',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#FDF7F2',
      colorBorder: '#EDD5C0',
      colorTextPrimary: '#3A1C0A',
      colorTextSecondary: '#7A4A30',
    },
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless ivory and deep navy',
    tokens: {
      colorPrimary: '#1B2E4A',
      colorPrimaryHover: '#112038',
      colorPrimaryLight: '#E8EDF5',
      colorAccent: '#C0A060',
      colorAccentHover: '#A88A50',
      colorAccentLight: '#FAF5E8',
      colorSecondary: '#6B7C9A',
      colorBackground: '#FDFBF7',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F9F7F3',
      colorBorder: '#DDD8CC',
      colorTextPrimary: '#0E1B2C',
      colorTextSecondary: '#5A6878',
    },
  },
};

export function getThemePreset(presetId: string): ThemePreset {
  return THEME_PRESETS[presetId] || THEME_PRESETS.romantic;
}

export function getAllThemePresets(): ThemePreset[] {
  return Object.values(THEME_PRESETS);
}

export function applyThemeTokens(tokens: ThemeTokens, el: HTMLElement = document.documentElement): void {
  el.style.setProperty('--color-primary', tokens.colorPrimary);
  el.style.setProperty('--color-primary-hover', tokens.colorPrimaryHover);
  el.style.setProperty('--color-primary-light', tokens.colorPrimaryLight);
  el.style.setProperty('--color-accent', tokens.colorAccent);
  el.style.setProperty('--color-accent-hover', tokens.colorAccentHover);
  el.style.setProperty('--color-accent-light', tokens.colorAccentLight);
  el.style.setProperty('--color-secondary', tokens.colorSecondary);
  el.style.setProperty('--color-background', tokens.colorBackground);
  el.style.setProperty('--color-surface', tokens.colorSurface);
  el.style.setProperty('--color-surface-subtle', tokens.colorSurfaceSubtle);
  el.style.setProperty('--color-border', tokens.colorBorder);
  el.style.setProperty('--color-text-primary', tokens.colorTextPrimary);
  el.style.setProperty('--color-text-secondary', tokens.colorTextSecondary);
}

export function applyThemePreset(presetId: string, el: HTMLElement = document.documentElement): void {
  const preset = getThemePreset(presetId);
  applyThemeTokens(preset.tokens, el);
}
