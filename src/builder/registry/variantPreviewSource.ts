function normalizePreviewSectionType(type: string): string {
  return type.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getVariantPreviewSource(type: string, variant: string): string {
  if (normalizePreviewSectionType(type) !== 'registry' && normalizePreviewSectionType(type) !== 'registrysection') {
    return variant;
  }

  switch (variant) {
    case 'fundHighlight':
    case 'featured':
    case 'honeymoon':
    case 'luxury':
    case 'experiences':
      return 'featured';
    case 'default':
    case 'cards':
    case 'grid':
    case 'minimal':
    case 'tabs':
    case 'illustrated':
    case 'classic':
    case 'modern':
    case 'playful':
      return 'cards';
    default:
      return variant;
  }
}
