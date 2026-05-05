import { describe, expect, it } from 'vitest';
import { buildScopedSectionCss, sanitizeBuilderCustomCss, sanitizeCustomClassName } from './customCss';

describe('builder custom CSS utilities', () => {
  it('sanitizes unsafe custom CSS fragments', () => {
    expect(sanitizeBuilderCustomCss('<style>@import url(test); .x{background:url(javascript:alert(1)); expression(foo)}</style>'))
      .not.toMatch(/style|@import|javascript:|expression/i);
  });

  it('scopes declaration-only CSS to the current section', () => {
    expect(buildScopedSectionCss('sec_1', 'border-radius: 24px; overflow: hidden;'))
      .toBe('[data-builder-section-id="sec_1"] { border-radius: 24px; overflow: hidden; }');
  });

  it('scopes selector rules without requiring users to know the section id', () => {
    expect(buildScopedSectionCss('sec_1', 'h2 { color: red; } .cta, a { color: blue; }'))
      .toContain('[data-builder-section-id="sec_1"] h2');
    expect(buildScopedSectionCss('sec_1', 'h2 { color: red; } .cta, a { color: blue; }'))
      .toContain('[data-builder-section-id="sec_1"] .cta, [data-builder-section-id="sec_1"] a');
  });

  it('allows ampersand as a section root shortcut', () => {
    expect(buildScopedSectionCss('sec_1', '& h2 { color: red; }'))
      .toBe('[data-builder-section-id="sec_1"] h2 { color: red; }');
  });

  it('scopes selectors inside responsive at-rules', () => {
    expect(buildScopedSectionCss('sec_1', '@media (max-width: 600px) { h2 { color: red; } }'))
      .toContain('@media (max-width: 600px) { [data-builder-section-id="sec_1"] h2');
  });

  it('keeps custom class names to safe tokens', () => {
    expect(sanitizeCustomClassName('luxury hero<script> featured_card'))
      .toBe('luxury heroscript featured_card');
  });
});
