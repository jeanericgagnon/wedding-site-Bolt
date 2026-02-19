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
    name: 'Romantic Blush',
    description: 'Dusty rose, warm ivory, and champagne gold',
    tokens: {
      colorPrimary: '#B5546A',
      colorPrimaryHover: '#9E3F57',
      colorPrimaryLight: '#FBF0F2',
      colorAccent: '#D4956A',
      colorAccentHover: '#BC7D54',
      colorAccentLight: '#FEF5EE',
      colorSecondary: '#C9A96E',
      colorBackground: '#FDF7F4',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#FEF9F7',
      colorBorder: '#EDD8DA',
      colorTextPrimary: '#2E1519',
      colorTextSecondary: '#7A4E55',
    },
  },

  elegant: {
    id: 'elegant',
    name: 'Modern Luxe',
    description: 'Near-black, warm whites, and brushed gold',
    tokens: {
      colorPrimary: '#1C1917',
      colorPrimaryHover: '#0C0A09',
      colorPrimaryLight: '#F5F5F4',
      colorAccent: '#C8A96E',
      colorAccentHover: '#B39058',
      colorAccentLight: '#FAF5E9',
      colorSecondary: '#78716C',
      colorBackground: '#FAF9F7',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F5F4F2',
      colorBorder: '#E7E5E4',
      colorTextPrimary: '#1C1917',
      colorTextSecondary: '#6B6763',
    },
  },

  garden: {
    id: 'garden',
    name: 'Botanical Garden',
    description: 'Herb sage, soft ivory, and terracotta warmth',
    tokens: {
      colorPrimary: '#4E7C5F',
      colorPrimaryHover: '#3C6249',
      colorPrimaryLight: '#EBF4EE',
      colorAccent: '#C47A4A',
      colorAccentHover: '#AD6438',
      colorAccentLight: '#FEF3EB',
      colorSecondary: '#9DB89F',
      colorBackground: '#F6F8F3',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F0F5EE',
      colorBorder: '#D0DFCE',
      colorTextPrimary: '#1A2E1E',
      colorTextSecondary: '#4A6650',
    },
  },

  ocean: {
    id: 'ocean',
    name: 'Coastal Escape',
    description: 'Deep sea teal, crisp white, and driftwood amber',
    tokens: {
      colorPrimary: '#1E5F6F',
      colorPrimaryHover: '#164F5D',
      colorPrimaryLight: '#E4EFF2',
      colorAccent: '#4BAABC',
      colorAccentHover: '#3A96A8',
      colorAccentLight: '#E6F6F9',
      colorSecondary: '#C8A96E',
      colorBackground: '#F3F8FA',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#EEF6F9',
      colorBorder: '#BED4DA',
      colorTextPrimary: '#0A2830',
      colorTextSecondary: '#356270',
    },
  },

  sunset: {
    id: 'sunset',
    name: 'Desert Sunset',
    description: 'Burnt sienna, warm cream, and dusty mauve',
    tokens: {
      colorPrimary: '#B85C38',
      colorPrimaryHover: '#9E4A2A',
      colorPrimaryLight: '#FBF0EB',
      colorAccent: '#D4956A',
      colorAccentHover: '#BC7D54',
      colorAccentLight: '#FEF5EE',
      colorSecondary: '#9C7A6A',
      colorBackground: '#FBF6F2',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#FDF8F5',
      colorBorder: '#EDD8CC',
      colorTextPrimary: '#2A140A',
      colorTextSecondary: '#7A4A38',
    },
  },

  classic: {
    id: 'classic',
    name: 'Timeless Navy',
    description: 'Deep navy, heirloom ivory, and gilded gold',
    tokens: {
      colorPrimary: '#1A2B4A',
      colorPrimaryHover: '#0F1E36',
      colorPrimaryLight: '#E8EDF5',
      colorAccent: '#C4983C',
      colorAccentHover: '#AC8230',
      colorAccentLight: '#FAF4E6',
      colorSecondary: '#6276A0',
      colorBackground: '#FDFBF6',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F8F5EE',
      colorBorder: '#D9D2C3',
      colorTextPrimary: '#0A1624',
      colorTextSecondary: '#53647E',
    },
  },

  editorial: {
    id: 'editorial',
    name: 'Editorial Dark',
    description: 'Warm charcoal, off-white parchment, and bronze',
    tokens: {
      colorPrimary: '#2D2926',
      colorPrimaryHover: '#1A1714',
      colorPrimaryLight: '#F3F1EF',
      colorAccent: '#B08860',
      colorAccentHover: '#9A7248',
      colorAccentLight: '#F9F3EC',
      colorSecondary: '#8C7B6E',
      colorBackground: '#F8F5F1',
      colorSurface: '#FEFCFA',
      colorSurfaceSubtle: '#F3EFE9',
      colorBorder: '#DDD7CE',
      colorTextPrimary: '#1C1714',
      colorTextSecondary: '#695E55',
    },
  },

  linen: {
    id: 'linen',
    name: 'Fresh Linen',
    description: 'Natural linen, clean white, and slate blue accents',
    tokens: {
      colorPrimary: '#3C5A78',
      colorPrimaryHover: '#2C4660',
      colorPrimaryLight: '#EAF0F6',
      colorAccent: '#7FAAC8',
      colorAccentHover: '#6B96B4',
      colorAccentLight: '#EEF5FA',
      colorSecondary: '#C2B08A',
      colorBackground: '#F8F6F2',
      colorSurface: '#FFFFFF',
      colorSurfaceSubtle: '#F4F2EE',
      colorBorder: '#DDD8CE',
      colorTextPrimary: '#1E2B3A',
      colorTextSecondary: '#6070848',
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
