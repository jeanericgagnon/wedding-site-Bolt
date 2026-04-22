export function getVariantPreviewSource(type: string, variant: string): string {
  if (type !== 'registry') {
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
