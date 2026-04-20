import { readBuilderValue } from './weddingProfile';

const readImageSetting = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    const maybeValue = (value as { value?: unknown }).value;
    if (typeof maybeValue === 'string') return maybeValue.trim();
  }
  return '';
};

export const getSectionPrimaryImage = (settings: Record<string, unknown>, fallback = ''): string => {
  const candidates = [
    settings.backgroundImage,
    settings.heroImage,
    settings.heroImageUrl,
    settings.image,
    settings.coverImage,
    settings.photo,
  ];

  for (const candidate of candidates) {
    const resolved = readImageSetting(candidate) || readBuilderValue(candidate as string | { value: string } | undefined, '');
    if (resolved) return resolved;
  }

  return fallback;
};
