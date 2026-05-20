#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import ts from 'typescript';

const trackedFiles = execFileSync('git', ['ls-files', 'src', 'supabase/functions'], {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
})
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !/\.test\./.test(file))
  .filter((file) => !/\.d\.ts$/.test(file))
  .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));

const forbiddenWriteOps = new Set(['insert', 'update', 'upsert', 'delete']);
const forbiddenRawPublicKeys = new Set([
  'site_json',
  'published_json',
  'wedding_data',
  'layout_config',
  'siteJson',
  'publishedJson',
  'weddingData',
  'layoutConfig',
]);
const criticalPublicBoundaryFiles = new Set([
  'src/lib/publicRenderContract.ts',
  'src/lib/publicSiteAccess.ts',
  'src/render/publicSectionDataSanitizer.ts',
]);
const criticalStorageBypassFiles = new Set([
  'src/components/auth/ProtectedRoute.tsx',
  'src/lib/paymentGate.ts',
]);
const internalToolingPaths = new Set([
  '/builder-v2-lab',
  '/variant-preview-capture',
  '/template-scroll-capture',
]);
const internalToolingRouteFiles = new Set([
  'src/routes/internalToolingRoutes.tsx',
]);

function scriptKindForFile(file) {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function getLine(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

function textOf(node, sourceFile) {
  return node.getText(sourceFile);
}

function unwrapExpression(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isNonNullExpression(current)
    || ts.isSatisfiesExpression?.(current)
  ) {
    current = current.expression;
  }
  return current;
}

function callChainContainsFrom(node) {
  const current = unwrapExpression(node);
  if (ts.isCallExpression(current)) {
    const expression = unwrapExpression(current.expression);
    if (ts.isPropertyAccessExpression(expression) && expression.name.text === 'from') {
      return true;
    }
    return callChainContainsFrom(expression);
  }
  if (ts.isPropertyAccessExpression(current)) {
    return callChainContainsFrom(current.expression);
  }
  return false;
}

function routePathValue(node) {
  if (!ts.isJsxSelfClosingElement(node) && !ts.isJsxElement(node)) return null;
  const tagName = ts.isJsxSelfClosingElement(node) ? node.tagName.getText() : node.openingElement.tagName.getText();
  if (tagName !== 'Route') return null;
  const attributes = ts.isJsxSelfClosingElement(node) ? node.attributes.properties : node.openingElement.attributes.properties;
  for (const attribute of attributes) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.text !== 'path') continue;
    const initializer = attribute.initializer;
    if (initializer && ts.isStringLiteral(initializer)) return initializer.text;
  }
  return null;
}

function propNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  return null;
}

function pushIssue(issues, sourceFile, node, kind, detail) {
  issues.push({
    kind,
    file: sourceFile.fileName,
    line: getLine(sourceFile, node.getStart(sourceFile)),
    detail,
  });
}

function scanSourceFile(sourceFile) {
  const issues = [];

  function visit(node) {
    if (sourceFile.fileName.startsWith('src/') && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const operation = node.expression.name.text;
      if (forbiddenWriteOps.has(operation) && callChainContainsFrom(node.expression.expression)) {
        pushIssue(issues, sourceFile, node, 'direct-client-write', `Direct client Supabase .${operation}() call found in shipped runtime.`);
      }
    }

    if (sourceFile.fileName.startsWith('src/') && ts.isJsxAttribute(node) && node.name.text === 'dangerouslySetInnerHTML') {
      pushIssue(issues, sourceFile, node, 'dangerously-set-inner-html', 'dangerouslySetInnerHTML is not allowed in shipped runtime surfaces.');
    }

    if (sourceFile.fileName.startsWith('src/') && ts.isIdentifier(node) && node.text === 'SUPABASE_SERVICE_ROLE_KEY') {
      pushIssue(issues, sourceFile, node, 'service-role-reference', 'SUPABASE_SERVICE_ROLE_KEY must not appear in client runtime code.');
    }

    if (criticalStorageBypassFiles.has(sourceFile.fileName)) {
      if (ts.isPropertyAccessExpression(node) && ['localStorage', 'sessionStorage'].includes(node.name.text)) {
        pushIssue(issues, sourceFile, node, 'storage-auth-bypass', 'Critical auth and payment gates must not depend on browser storage for authorization.');
      }
      if (ts.isIdentifier(node) && ['localStorage', 'sessionStorage'].includes(node.text)) {
        pushIssue(issues, sourceFile, node, 'storage-auth-bypass', 'Critical auth and payment gates must not depend on browser storage for authorization.');
      }
    }

    if (criticalPublicBoundaryFiles.has(sourceFile.fileName)) {
      if (ts.isSpreadAssignment(node)) {
        const spreadText = textOf(node.expression, sourceFile);
        if ([...forbiddenRawPublicKeys].some((key) => spreadText.includes(key))) {
          pushIssue(issues, sourceFile, node, 'raw-public-payload', 'Raw site/wedding/layout blobs must not be spread into public DTO boundaries.');
        }
      }
      if (ts.isPropertyAssignment(node)) {
        const name = propNameText(node.name);
        if (name && forbiddenRawPublicKeys.has(name)) {
          pushIssue(issues, sourceFile, node, 'raw-public-payload', `Forbidden raw public payload key "${name}" found in public DTO boundary.`);
        }
      }
    }

    if (internalToolingRouteFiles.has(sourceFile.fileName)) {
      const path = routePathValue(node);
      if (path && internalToolingPaths.has(path)) {
        const nodeText = textOf(node, sourceFile);
        const hasGuard = nodeText.includes('internalToolingRoutesEnabled ?') || nodeText.includes('internalToolingCaptureRoutesEnabled ?');
        if (!hasGuard) {
          pushIssue(issues, sourceFile, node, 'internal-tooling-route', `Internal tooling route ${path} is not guarded by an internal tooling route access flag.`);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

const existingTrackedFiles = trackedFiles.filter((file) => existsSync(file));

const issues = existingTrackedFiles.flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, scriptKindForFile(file));
  return scanSourceFile(sourceFile);
});

const output = {
  ok: issues.length === 0,
  blocked: false,
  slice: 'ast-security',
  generatedAt: new Date().toISOString(),
  trackedFilesScanned: existingTrackedFiles.length,
  summary: issues.length === 0
    ? 'AST-backed security guard found no launch-critical runtime auth, storage, or direct-write regressions.'
    : 'AST-backed security guard found launch-critical runtime auth, storage, or direct-write regressions.',
  contractSummary: issues.length === 0
    ? 'AST security proof is green: this source-level security lane guards critical runtime auth/storage/public-boundary patterns, but it supports rather than replaces live permission and guest-surface proof.'
    : 'AST security proof is not green: source-level auth/storage/public-boundary regressions exist and must be fixed before stronger launch-hardening claims remain credible.',
  automatedCoverage: [
    'AST-scans shipped runtime code for direct client Supabase .insert/.update/.upsert/.delete calls instead of relying only on regex matching.',
    'Fails if SUPABASE_SERVICE_ROLE_KEY appears in client runtime code or if critical auth/payment files touch browser storage for authorization.',
    'Fails on dangerouslySetInnerHTML in shipped runtime code and on raw public blob keys leaking into public DTO boundaries.',
    'Checks that internal tooling routes in src/routes/internalToolingRoutes.tsx stay guarded by an internal tooling route access flag.',
  ],
  stillManualProofNeeded: [
    'Expand this AST guard when new runtime auth or public-boundary surfaces are added.',
    'Keep the live client-RLS matrix and live guest/public proof lanes current alongside this static guard.',
  ],
  issues,
};

console.log(JSON.stringify(output, null, 2));
if (!output.ok) process.exit(1);
