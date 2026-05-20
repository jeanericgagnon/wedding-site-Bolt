#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const commands = [
  {
    id: 'service-role-authorization',
    command: ['npm', 'run', 'proof:v1:service-role-authorization'],
  },
  {
    id: 'email-messaging-authorization',
    command: ['npm', 'run', 'proof:v1:email-messaging-authorization'],
  },
  {
    id: 'board-freshness',
    command: ['npm', 'run', 'proof:v1:board:freshness'],
  },
  {
    id: 'board-raw',
    command: ['npm', 'run', 'proof:v1:board'],
  },
  {
    id: 'board-markdown',
    command: ['npm', 'run', 'proof:v1:board:md'],
  },
  {
    id: 'git-diff-check',
    command: ['git', 'diff', '--check'],
  },
];

function tryParseJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) return null;
  const candidate = trimmed.slice(firstBrace);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

const steps = commands.map(({ id, command }) => {
  const result = spawnSync(command[0], command.slice(1), {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return {
    id,
    command: command.join(' '),
    exitCode: result.status ?? 1,
    ok: (result.status ?? 1) === 0,
    blocked: false,
    parsed: tryParseJson(result.stdout ?? ''),
    stdoutPreview: (result.stdout ?? '').trim().slice(0, 400),
    stderrPreview: (result.stderr ?? '').trim().slice(0, 400),
  };
});

const blockedBySecret = steps.flatMap((step) => {
  const blockers = Array.isArray(step.parsed?.blockers) ? step.parsed.blockers : [];
  return blockers.filter((blocker) => blocker?.blockerType === 'missing_service_role_key');
});

const ok = steps.every((step) => step.ok) && blockedBySecret.length === 0;

console.log(JSON.stringify({
  ok,
  generatedAt: new Date().toISOString(),
  mode: 'launch_closeout_bundle',
  blocked: blockedBySecret.length > 0,
  summary: blockedBySecret.length > 0
    ? 'Launch closeout is blocked on secure proof secrets; this helper/local bundle is the path that refreshes board artifacts after the secure authorization checks clear.'
    : 'Launch closeout stays aligned: secure authorization proofs run first, then this helper/local bundle refreshes board freshness plus the raw and markdown board outputs.',
  contractSummary: blockedBySecret.length > 0
    ? 'Launch closeout is the helper/local secure closeout lane, but it cannot establish final secure launch truth until the required service-role proof environment exists.'
    : 'Launch closeout is the helper/local secure closeout lane that refreshes canonical board artifacts after the secure authorization proofs pass; it complements the proof board rather than replacing it.',
  blockers: blockedBySecret,
  steps: steps.map((step) => ({
    id: step.id,
    command: step.command,
    ok: step.ok,
    exitCode: step.exitCode,
    blocked: Array.isArray(step.parsed?.blockers) && step.parsed.blockers.some((blocker) => blocker?.blockerType === 'missing_service_role_key'),
  })),
  nextActions: blockedBySecret.length > 0
    ? [
        'Set SUPABASE_SERVICE_ROLE_KEY in the secure proof environment.',
        'Rerun npm run proof:v1:launch-closeout.',
      ]
    : [
        'Review the secure proof outputs and update launch docs if any step failed.',
      ],
}, null, 2));

process.exit(ok ? 0 : 1);
