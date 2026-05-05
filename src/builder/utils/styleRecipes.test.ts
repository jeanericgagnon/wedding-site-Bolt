import { describe, expect, it } from 'vitest';
import { applyBuilderStyleRecipe, clearBuilderStyleRecipe, getBuilderStyleRecipe } from './styleRecipes';

describe('builder style recipes', () => {
  it('applies a recipe without removing expert CSS', () => {
    const next = applyBuilderStyleRecipe({ customCss: 'h2 { color: red; }' }, 'editorial');

    expect(next.styleRecipeId).toBe('editorial');
    expect(next.customCss).toBe('h2 { color: red; }');
    expect(next.backgroundColor).toBeTruthy();
    expect(next.styleRecipeCss).toContain('& h1');
  });

  it('clears recipe-owned styling but preserves unrelated overrides', () => {
    const next = clearBuilderStyleRecipe({
      styleRecipeId: 'garden',
      styleRecipeCss: '& h2 { color: green; }',
      backgroundColor: '#fff',
      textColor: '#111',
      paddingTop: '5rem',
      paddingBottom: '5rem',
      animationPreset: 'fade-up',
      customCss: 'h2 { color: red; }',
      sideImage: '/photo.jpg',
    });

    expect(next.styleRecipeId).toBeUndefined();
    expect(next.backgroundColor).toBeUndefined();
    expect(next.customCss).toBe('h2 { color: red; }');
    expect(next.sideImage).toBe('/photo.jpg');
  });

  it('returns null for unknown recipes', () => {
    expect(getBuilderStyleRecipe('unknown')).toBeNull();
  });
});
