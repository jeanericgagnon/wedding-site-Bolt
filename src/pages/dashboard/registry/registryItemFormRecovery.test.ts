import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('registry item form fresh-attempt recovery wiring', () => {
  it('clears stale link-import feedback when the owner edits link-imported fields again', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/RegistryItemForm.tsx'), 'utf8');
    const expectFieldEditClearsLinkFeedback = (field: string) => {
      expect(source).toMatch(
        new RegExp(
          `clearLinkImportFeedback\\(\\);[\\s\\S]{0,160}clearBarcodeLookupFeedback\\(\\{ keepLookup: true \\}\\);[\\s\\S]{0,160}set\\('${field}', e\\.target\\.value\\);`,
        ),
      );
    };

    expect(source).toContain('const clearLinkImportFeedback = useCallback(() => {');
    expect(source).toContain('setFetchError(null);');
    expect(source).toContain('setFetchDone(false);');
    expect(source).toContain('setFetchConfidence(null);');
    expect(source).toContain('setDedupeWarning(null);');
    expect(source).toContain('clearLinkImportFeedback();\n                          setUrlInput(nextUrl);');
    expectFieldEditClearsLinkFeedback('item_name');
    expectFieldEditClearsLinkFeedback('price_amount');
    expectFieldEditClearsLinkFeedback('merchant');
    expectFieldEditClearsLinkFeedback('image_url');
    expectFieldEditClearsLinkFeedback('notes');
  });

  it('clears stale barcode and save feedback when the owner starts a new barcode/manual attempt', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/RegistryItemForm.tsx'), 'utf8');

    expect(source).toContain('const clearSaveFeedback = useCallback(() => {');
    expect(source).toContain('const clearBarcodeLookupFeedback = useCallback((options?: { keepLookup?: boolean }) => {');
    expect(source).toContain('setBarcodeLookupError(null);');
    expect(source).toContain('if (!options?.keepLookup) {');
    expect(source).toContain('setBarcodeLookup(null);');
    expect(source).toContain("clearSaveFeedback();\n                      clearBarcodeLookupFeedback();\n                      setBarcodeInput(nextValue);");
    expect(source).toContain("clearBarcodeLookupFeedback();\n                    set('barcode', e.target.value);");
    expect(source).toContain("clearSaveFeedback();\n                        clearLinkImportFeedback();\n                        clearBarcodeLookupFeedback();\n                        setSourceMode(mode);");
  });

  it('clears stale vault settings save errors when the owner edits the vault again', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultEditModal.tsx'), 'utf8');

    expect(source).toContain('const clearLocalError = () => setLocalError(null);');
    expect(source).toContain("onChange={(e) => { clearLocalError(); setLabel(e.target.value); setLabelManuallyEdited(true); }}");
    expect(source).toContain('clearLocalError();');
    expect(source).toContain('setDurationYears(newYears);');
    expect(source).toContain('setDurationYears(Math.max(1, Math.min(100, Number(e.target.value))));');
  });

  it('rehydrates vault and registry editor drafts when a different record is loaded', () => {
    const vaultSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultEditModal.tsx'), 'utf8');
    const registrySource = readFileSync(join(process.cwd(), 'src/pages/dashboard/registry/RegistryItemForm.tsx'), 'utf8');
    const seatingSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/seating/SeatingDashboardComponents.tsx'), 'utf8');

    expect(vaultSource).toContain('useEffect(() => {');
    expect(vaultSource).toContain('setLabel(config.label);');
    expect(vaultSource).toContain('setDurationYears(config.duration_years);');
    expect(vaultSource).toContain('setLabelManuallyEdited(false);');
    expect(vaultSource).toContain('setLocalError(null);');

    expect(registrySource).toContain('setDraft(nextDraft);');
    expect(registrySource).toContain("setUrlInput(initial?.item_url ?? initial?.canonical_url ?? '');");
    expect(registrySource).toContain("setBarcodeInput(initial?.barcode ?? '');");
    expect(registrySource).toContain('setLastPreview(null);');
    expect(registrySource).toContain('setSaveError(null);');
    expect(registrySource).toContain('setBarcodeLookup(null);');
    expect(registrySource).toContain('lastAutoFetchedUrlRef.current = \'\';');

    expect(seatingSource).toContain('setName(initial?.table_name ?? \'\');');
    expect(seatingSource).toContain('setCapacity(initial?.capacity ?? 8);');
    expect(seatingSource).toContain("setShape((initial?.table_shape as TableShape) ?? 'round');");
    expect(seatingSource).toContain('setLayoutWidth(initial?.layout_width ?? 260);');
    expect(seatingSource).toContain('setLayoutHeight(initial?.layout_height ?? 150);');
  });

  it('cancels stale seating table autosaves when the active table record changes', () => {
    const seatingSource = readFileSync(join(process.cwd(), 'src/pages/dashboard/seating/SeatingDashboardComponents.tsx'), 'utf8');

    expect(seatingSource).toContain("import React, { useCallback, useEffect, useRef, useState } from 'react';");
    expect(seatingSource).toContain('if (autoSaveTimerRef.current) {\n      window.clearTimeout(autoSaveTimerRef.current);\n      autoSaveTimerRef.current = null;\n    }\n\n    setName(initial?.table_name ?? \'\');');
    expect(seatingSource).toContain('const buildPayload = useCallback(() => {');
    expect(seatingSource).toContain('}, [capacity, layoutHeight, layoutWidth, name, notes, shape]);');
    expect(seatingSource).toContain('}, [buildPayload, initial?.id, onSave]);');
    expect(seatingSource).not.toContain('// eslint-disable-next-line react-hooks/exhaustive-deps');
  });
});
