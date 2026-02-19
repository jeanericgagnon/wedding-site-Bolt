import { ThemeTokens } from './themePresets';

export function buildThemeCss(tokens: ThemeTokens, scope: string): string {
  return `
${scope} {
  --color-primary: ${tokens.colorPrimary};
  --color-primary-hover: ${tokens.colorPrimaryHover};
  --color-primary-light: ${tokens.colorPrimaryLight};
  --color-accent: ${tokens.colorAccent};
  --color-accent-hover: ${tokens.colorAccentHover};
  --color-accent-light: ${tokens.colorAccentLight};
  --color-secondary: ${tokens.colorSecondary};
  --color-background: ${tokens.colorBackground};
  --color-surface: ${tokens.colorSurface};
  --color-surface-subtle: ${tokens.colorSurfaceSubtle};
  --color-border: ${tokens.colorBorder};
  --color-text-primary: ${tokens.colorTextPrimary};
  --color-text-secondary: ${tokens.colorTextSecondary};
}

${scope} section,
${scope} [data-section] {
  background-color: var(--color-background);
}

${scope} section.bg-white,
${scope} [data-section].bg-white {
  background-color: var(--color-surface);
}

${scope} h1, ${scope} h2, ${scope} h3, ${scope} h4 {
  color: var(--color-text-primary);
}

${scope} p {
  color: var(--color-text-secondary);
}

${scope} a[href^="#rsvp"],
${scope} button[class*="bg-stone-900"],
${scope} button[class*="bg-gray-900"],
${scope} a[class*="bg-stone-900"],
${scope} a[class*="bg-gray-900"] {
  background-color: var(--color-primary) !important;
  color: #ffffff !important;
}

${scope} button[class*="bg-rose"],
${scope} a[class*="bg-rose"] {
  background-color: var(--color-primary) !important;
}

${scope} [class*="text-rose"] {
  color: var(--color-primary) !important;
}

${scope} [class*="border-rose"] {
  border-color: var(--color-primary) !important;
}

${scope} [class*="bg-stone-50"],
${scope} [class*="bg-gray-50"] {
  background-color: var(--color-surface-subtle) !important;
}

${scope} [class*="text-stone-900"],
${scope} [class*="text-gray-900"] {
  color: var(--color-text-primary) !important;
}

${scope} [class*="text-stone-600"],
${scope} [class*="text-stone-500"],
${scope} [class*="text-gray-600"],
${scope} [class*="text-gray-500"] {
  color: var(--color-text-secondary) !important;
}

${scope} [class*="border-stone-200"],
${scope} [class*="border-gray-200"] {
  border-color: var(--color-border) !important;
}
`.trim();
}

export function injectThemeStyle(tokens: ThemeTokens | undefined, styleId: string, scope: string): void {
  if (!tokens) return;
  let el = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  el.textContent = buildThemeCss(tokens, scope);
}

export function removeThemeStyle(styleId: string): void {
  const el = document.getElementById(styleId);
  if (el) el.remove();
}
