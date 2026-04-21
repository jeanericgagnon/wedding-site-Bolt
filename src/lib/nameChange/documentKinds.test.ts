import { describe, expect, it } from 'vitest';
import { canonicalizeNameChangeDocumentKind, getNameChangeDocumentKindAliases, matchesNameChangeDocumentKind } from './documentKinds';

describe('documentKinds', () => {
  it('canonicalizes legacy court-order aliases onto the shared planner kind', () => {
    expect(canonicalizeNameChangeDocumentKind('court_order')).toBe('court_order');
    expect(canonicalizeNameChangeDocumentKind('court_order_name_change')).toBe('court_order');
  });

  it('expands canonical aliases for shared court-order lookups', () => {
    expect(getNameChangeDocumentKindAliases('court_order')).toEqual(['court_order', 'court_order_name_change']);
    expect(getNameChangeDocumentKindAliases('court_order_name_change')).toEqual(['court_order', 'court_order_name_change']);
    expect(getNameChangeDocumentKindAliases('marriage_certificate')).toEqual(['marriage_certificate']);
  });

  it('treats court-order aliases as the same document family', () => {
    expect(matchesNameChangeDocumentKind('court_order_name_change', 'court_order')).toBe(true);
    expect(matchesNameChangeDocumentKind('court_order', 'court_order_name_change')).toBe(true);
    expect(matchesNameChangeDocumentKind('marriage_certificate', 'court_order')).toBe(false);
  });
});
