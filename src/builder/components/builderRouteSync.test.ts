import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('builder route sync guards', () => {
  it('drives builder route flags from live router location instead of frozen window search', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/builder/components/BuilderShell.tsx'),
      'utf8',
    );
    const topBar = readFileSync(
      join(process.cwd(), 'src/builder/components/BuilderTopBar.tsx'),
      'utf8',
    );

    expect(source).toContain("import { useLocation, useNavigate } from 'react-router-dom';");
    expect(source).toContain('storageScope?: string | null;');
    expect(source).toContain('storageScope,');
    expect(source).toContain('const location = useLocation();');
    expect(source).toContain('const navigate = useNavigate();');
    expect(source).toContain('if (shouldAutoPublishFromSearch(location.search)) {');
    expect(source).toContain('const shouldFocusTravel = shouldFocusTravelSectionFromSearch(location.search);');
    expect(source).toContain('const params = new URLSearchParams(location.search);');
    expect(source).toContain('const consumeBuilderRouteHint = useCallback((key: string, value?: string) => {');
    expect(source).toContain("consumeBuilderRouteHint('openTemplates', '1');");
    expect(source).toContain("consumeBuilderRouteHint('panel', 'design');");
    expect(source).toContain("consumeBuilderRouteHint('tool', 'travel');");
    expect(source).toContain("consumeBuilderRouteHint('tool', 'hotel-block');");
    expect(source).toContain('if (shouldOpenDesignPanelFromSearch(location.search)) {');
    expect(source).toContain('initialPublishChecklistOpen={shouldOpenPublishChecklistFromSearch(location.search)}');
    expect(source).toContain("if (params.get('builderTour') === '1') {");
    expect(source).toContain("params.delete('builderTour');");
    expect(source).toContain('const seen = readBuilderCoachmarkSeen(key, storageScope);');
    expect(source).toContain('if (!seen) writeBuilderCoachmarkSeen(key, true, storageScope);');
    expect(source).toContain("writeBuilderCoachmarkSeen('builder_coachmarks_seen_v1', true, storageScope)");
    expect(source).toContain("navigate(`${location.pathname}${params.toString() ? `?${params.toString()}` : ''}${location.hash}`, { replace: true });");
    expect(topBar).toContain('const routeWantsPublishChecklist = initialPublishChecklistOpen || shouldOpenPublishChecklistFromSearch(location.search);');
    expect(topBar).toContain("const tool = params.get('tool');");
    expect(topBar).toContain("if (tool !== 'share' && tool !== 'qr-codes') return;");
    expect(topBar).toContain("params.delete('tool');");
    expect(source).not.toContain('shouldAutoPublishFromSearch(window.location.search)');
    expect(source).not.toContain('shouldFocusTravelSectionFromSearch(window.location.search)');
    expect(source).not.toContain('shouldOpenDesignPanelFromSearch(window.location.search)');
    expect(source).not.toContain('shouldOpenPublishChecklistFromSearch(window.location.search)');
  });
});
