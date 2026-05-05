import type { BuilderSectionStyleOverrides } from '../../types/builder/section';

export type BuilderStyleRecipeId = 'editorial' | 'black-tie' | 'garden' | 'minimal' | 'playful' | 'warm-weekend';

export interface BuilderStyleRecipe {
  id: BuilderStyleRecipeId;
  label: string;
  description: string;
  backgroundColor: string;
  textColor: string;
  paddingTop: string;
  paddingBottom: string;
  animationPreset: NonNullable<BuilderSectionStyleOverrides['animationPreset']>;
  styleRecipeCss: string;
}

export const BUILDER_STYLE_RECIPES: BuilderStyleRecipe[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Large, airy, magazine-style contrast.',
    backgroundColor: '#fbfaf7',
    textColor: '#171412',
    paddingTop: '7rem',
    paddingBottom: '7rem',
    animationPreset: 'fade-up',
    styleRecipeCss: `
& h1, & h2 { letter-spacing: 0.01em; line-height: 0.98; }
& p { max-width: 64ch; }
& img { filter: saturate(0.94) contrast(1.04); }
`.trim(),
  },
  {
    id: 'black-tie',
    label: 'Black Tie',
    description: 'Dramatic dark polish for formal sections.',
    backgroundColor: '#11100f',
    textColor: '#fffaf0',
    paddingTop: '6rem',
    paddingBottom: '6rem',
    animationPreset: 'blur-in',
    styleRecipeCss: `
& { color-scheme: dark; }
& h1, & h2, & h3 { color: #fffaf0 !important; }
& p, & li, & span { color: rgba(255, 250, 240, 0.78); }
& a, & button { border-color: rgba(255, 250, 240, 0.28); }
`.trim(),
  },
  {
    id: 'garden',
    label: 'Garden',
    description: 'Soft botanical tone with relaxed spacing.',
    backgroundColor: '#f3f7ef',
    textColor: '#243023',
    paddingTop: '5rem',
    paddingBottom: '5rem',
    animationPreset: 'reveal-left',
    styleRecipeCss: `
& { background-image: radial-gradient(circle at 12% 8%, rgba(119, 146, 103, 0.12), transparent 30%); }
& h1, & h2, & h3 { color: #243023 !important; }
& img { border-radius: 18px; }
`.trim(),
  },
  {
    id: 'minimal',
    label: 'Minimal',
    description: 'Quiet whitespace and crisp hierarchy.',
    backgroundColor: '#ffffff',
    textColor: '#171717',
    paddingTop: '5rem',
    paddingBottom: '5rem',
    animationPreset: 'fade-in',
    styleRecipeCss: `
& h1, & h2 { letter-spacing: 0; }
& p { color: rgba(23, 23, 23, 0.66); }
& img { border-radius: 8px; }
`.trim(),
  },
  {
    id: 'playful',
    label: 'Playful',
    description: 'Fresh, social, and a little more lively.',
    backgroundColor: '#fff7fb',
    textColor: '#3b1728',
    paddingTop: '5.5rem',
    paddingBottom: '5.5rem',
    animationPreset: 'float-in',
    styleRecipeCss: `
& { background-image: linear-gradient(135deg, rgba(244, 114, 182, 0.10), rgba(251, 191, 36, 0.08)); }
& h1, & h2, & h3 { color: #3b1728 !important; }
& a, & button { border-radius: 999px; }
`.trim(),
  },
  {
    id: 'warm-weekend',
    label: 'Weekend',
    description: 'Destination-weekend warmth for logistics.',
    backgroundColor: '#fff8ed',
    textColor: '#3a2a1b',
    paddingTop: '5rem',
    paddingBottom: '5rem',
    animationPreset: 'slide-up',
    styleRecipeCss: `
& { background-image: linear-gradient(180deg, rgba(255,255,255,0.52), rgba(255,248,237,0)); }
& h1, & h2, & h3 { color: #3a2a1b !important; }
& p, & li { color: rgba(58, 42, 27, 0.72); }
`.trim(),
  },
];

export function getBuilderStyleRecipe(id: unknown): BuilderStyleRecipe | null {
  return BUILDER_STYLE_RECIPES.find((recipe) => recipe.id === id) ?? null;
}

export function applyBuilderStyleRecipe(
  overrides: BuilderSectionStyleOverrides,
  recipeId: BuilderStyleRecipeId,
): BuilderSectionStyleOverrides {
  const recipe = getBuilderStyleRecipe(recipeId);
  if (!recipe) return overrides;

  return {
    ...overrides,
    styleRecipeId: recipe.id,
    styleRecipeCss: recipe.styleRecipeCss,
    backgroundColor: recipe.backgroundColor,
    textColor: recipe.textColor,
    paddingTop: recipe.paddingTop,
    paddingBottom: recipe.paddingBottom,
    animationPreset: recipe.animationPreset,
  };
}

export function clearBuilderStyleRecipe(overrides: BuilderSectionStyleOverrides): BuilderSectionStyleOverrides {
  const {
    styleRecipeId: _styleRecipeId,
    styleRecipeCss: _styleRecipeCss,
    backgroundColor: _backgroundColor,
    textColor: _textColor,
    paddingTop: _paddingTop,
    paddingBottom: _paddingBottom,
    animationPreset: _animationPreset,
    ...rest
  } = overrides;

  return rest;
}
