import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard utility reset wiring', () => {
  it('resets RSVP board state when user or site context disappears', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/RsvpBoard.tsx'),
      'utf8',
    );

    expect(source).toContain('const resetRsvpBoardState = useCallback(() => {');
    expect(source).toContain('const currentSiteIdRef = useRef<string | null>(null);');
    expect(source).toContain('const boardRequestIdRef = useRef(0);');
    expect(source).toContain("setFilter('all');");
    expect(source).toContain("setSiteId('demo-site-id');\n          setFilter('all');");
    expect(source).toContain('if (currentSiteIdRef.current !== weddingSiteId) return;');
    expect(source).toContain("setSiteId(id);\n        setFilter('all');\n        await fetchBoard(id);");
    expect(source).toContain("if (!user) {\n        if (mounted) {\n          resetRsvpBoardState();\n          setLoading(false);\n        }\n        return;\n      }");
    expect(source).toContain("if (!id) {\n          resetRsvpBoardState();\n          return;\n        }");
  });

  it('resets seating lookup state and search when site context disappears or changes', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/SeatingLookup.tsx'),
      'utf8',
    );

    expect(source).toContain('const resetSeatingLookupState = useCallback(() => {');
    expect(source).toContain('const resetSeatingLookupInteractionState = useCallback(() => {');
    expect(source).toContain('const eventsRequestIdRef = useRef(0);');
    expect(source).toContain('const rowsRequestIdRef = useRef(0);');
    expect(source).toContain('const isCurrentRequest = () => mounted && requestId === rowsRequestIdRef.current;');
    expect(source).toContain("setQuery('');");
    expect(source).toContain('const previousSiteIdRef = useRef<string | null>(null);');
    expect(source).toContain(
      "if (previousSiteIdRef.current && siteId && previousSiteIdRef.current !== siteId) {\n      resetSeatingLookupInteractionState();\n    }",
    );
    expect(source).toContain(
      "if (!siteId && !isDemoMode) {\n      resetSeatingLookupInteractionState();\n    }",
    );
  });

  it('resets audit and error log operator state when user context disappears or changes', () => {
    const auditSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/AuditLogs.tsx'),
      'utf8',
    );
    const errorSource = readFileSync(
      join(process.cwd(), 'src/pages/dashboard/ErrorLogs.tsx'),
      'utf8',
    );

    expect(auditSource).toContain('const resetAuditLogsState = useCallback(() => {');
    expect(auditSource).toContain("setActionFilter('all');");
    expect(auditSource).toContain('const auditLogsRequestIdRef = useRef(0);');
    expect(auditSource).toContain('const isCurrentRequest = () => mounted && requestId === auditLogsRequestIdRef.current;');
    expect(auditSource).toContain('const previousUserIdRef = useRef<string | null>(null);');
    expect(auditSource).toContain(
      "if (previousUserIdRef.current && userId && previousUserIdRef.current !== userId) {\n      resetAuditLogsState();\n    }",
    );

    expect(errorSource).toContain('const resetErrorLogsState = useCallback(() => {');
    expect(errorSource).toContain("setSeverityFilter('all');");
    expect(errorSource).toContain("setPage(1);");
    expect(errorSource).toContain('const previousUserIdRef = useRef<string | null>(null);');
    expect(errorSource).toContain('const adminCheckRequestIdRef = useRef(0);');
    expect(errorSource).toContain('const errorLogsRequestIdRef = useRef(0);');
    expect(errorSource).toContain('const isCurrentRequest = () => mounted && requestId === adminCheckRequestIdRef.current;');
    expect(errorSource).toContain(
      "if (previousUserIdRef.current && userId && previousUserIdRef.current !== userId) {\n      resetErrorLogsState();\n    }",
    );
    expect(errorSource).toContain("if (!isAdmin) {\n      errorLogsRequestIdRef.current += 1;\n      setRows([]);\n      setExpandedId(null);\n      setCopyStatus(null);\n      setLogsLoading(false);\n      return;\n    }");
  });
});
