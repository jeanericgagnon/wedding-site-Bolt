const MAX_CUSTOM_CSS_LENGTH = 6000;

const SECTION_ID_ATTR = 'data-builder-section-id';

function escapeCssAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function sanitizeCustomClassName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .split(/\s+/)
    .map((token) => token.trim().replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');
}

export function sanitizeBuilderCustomCss(value: unknown): string {
  if (typeof value !== 'string') return '';

  return value
    .slice(0, MAX_CUSTOM_CSS_LENGTH)
    .replace(/<\/?style[^>]*>/gi, '')
    .replace(/<\/?script[^>]*>/gi, '')
    .replace(/@import\s+[^;]+;?/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\(/gi, '')
    .replace(/behavior\s*:/gi, '')
    .trim();
}

export function getSectionScopeSelector(sectionId: string): string {
  return `[${SECTION_ID_ATTR}="${escapeCssAttributeValue(sectionId)}"]`;
}

function prefixSelectorList(selectorList: string, scope: string): string {
  return selectorList
    .split(',')
    .map((selector) => {
      const trimmed = selector.trim();
      if (!trimmed) return '';
      if (trimmed.includes(scope)) return trimmed;
      if (trimmed.startsWith('&')) return trimmed.split('&').join(scope);
      return `${scope} ${trimmed}`;
    })
    .filter(Boolean)
    .join(', ');
}

function prefixTopLevelRules(css: string, scope: string): string {
  return css.replace(/(^|})\s*([^@{}][^{}]*)\{/g, (_match, boundary: string, selectorList: string) => {
    const prefixed = prefixSelectorList(selectorList, scope);
    return `${boundary} ${prefixed} {`;
  });
}

function prefixNestedAtRuleRules(css: string, scope: string): string {
  return css.replace(/(@(?:media|supports|container)\s[^{]+\{)([\s\S]*?)(\n?\})/gi, (_match, opener: string, body: string, closer: string) => (
    `${opener}${prefixTopLevelRules(body, scope)}${closer}`
  ));
}

export function buildScopedSectionCss(sectionId: string, customCss: unknown): string {
  const css = sanitizeBuilderCustomCss(customCss);
  if (!css) return '';

  const scope = getSectionScopeSelector(sectionId);

  if (!css.includes('{')) {
    return `${scope} { ${css} }`;
  }

  if (css.includes('&')) {
    return css.split('&').join(scope);
  }

  return prefixTopLevelRules(prefixNestedAtRuleRules(css, scope), scope);
}
