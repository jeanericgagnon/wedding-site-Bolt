function normalizePreviewSectionType(type: string): string {
  return type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isRegistryPreviewSectionType(type: string): boolean {
  const normalizedType = normalizePreviewSectionType(type);
  return normalizedType === 'registry' || normalizedType.startsWith('registrysection');
}

export function getVariantPreviewSource(type: string, variant: string): string {
  if (!isRegistryPreviewSectionType(type)) {
    return variant;
  }

  switch (variant) {
    case 'fundHighlight':
    case 'honeymoon':
    case 'tabs':
    case 'illustrated':
    case 'minimal':
      return variant;
    case 'featured':
    case 'luxury':
    case 'experiences':
      return 'featured';
    case 'default':
    case 'cards':
    case 'grid':
    case 'classic':
    case 'modern':
    case 'playful':
      return 'cards';
    default:
      return variant;
  }
}
