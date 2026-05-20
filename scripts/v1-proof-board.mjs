#!/usr/bin/env node

import fs from 'node:fs';

const BACKLOG_PATH = process.env.V1_PROOF_BOARD_BACKLOG_PATH || 'BACKLOG.md';

const formatPacificTimestamp = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const zone = (byType.timeZoneName || 'PT').replace(/^PST$|^PDT$/, 'PT');
  return `${byType.year}-${byType.month}-${byType.day} ${byType.hour}:${byType.minute} ${byType.dayPeriod} ${zone}`;
};

const readBacklog = () => {
  try {
    return fs.readFileSync(BACKLOG_PATH, 'utf8');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown backlog read failure.';
    console.error(`[proof:v1:board] Failed to read backlog source \`${BACKLOG_PATH}\`: ${message}`);
    process.exit(1);
  }
};

const parseBacklogTimestamp = (value) => {
  if (!value) return null;
  const cleaned = value.replace(/`/g, '').trim();
  const match = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2}) (AM|PM) (PT|PDT|PST)$/,
  );
  if (!match) return null;

  const [, year, month, day, rawHour, minute, dayPeriod] = match;
  let hour = Number(rawHour);
  if (dayPeriod === 'AM' && hour === 12) hour = 0;
  if (dayPeriod === 'PM' && hour !== 12) hour += 12;

  const isoLike = `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${minute}:00`;
  const parsed = new Date(isoLike);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const describeStateFreshness = (currentState, generatedAt) => {
  const reportedAt = parseBacklogTimestamp(currentState['Current date/time']);
  const generatedAtDate = parseBacklogTimestamp(generatedAt);

  if (!reportedAt || !generatedAtDate) {
    return {
      status: 'UNKNOWN',
      warning: 'Current state freshness could not be evaluated from the backlog timestamp.',
    };
  }

  const ageHours = Math.round(((generatedAtDate.getTime() - reportedAt.getTime()) / 36e5) * 10) / 10;
  if (ageHours <= 24) {
    return {
      status: 'FRESH',
      warning: '',
      ageHours,
    };
  }

  return {
    status: 'STALE',
    warning: `Current state snapshot in \`${BACKLOG_PATH}\` is ${ageHours} hours older than this generated board.`,
    ageHours,
  };
};

const parseCurrentStateTable = (text) => {
  const lines = text.split(/\r?\n/);
  const state = {};
  let inTable = false;

  for (const line of lines) {
    if (!inTable) {
      if (line.trim() === '| Field | Current State |') {
        inTable = true;
      }
      continue;
    }

    if (!line.startsWith('|')) break;
    if (line.includes('---')) continue;

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length === 2) {
      state[cells[0]] = cells[1];
    }
  }

  return state;
};

const extractSections = (text) => {
  const lines = text.split(/\r?\n/);
  const sections = {};
  let current = null;
  let buffer = [];

  const flush = () => {
    if (!current) return;
    sections[current] = buffer.join('\n').trim();
  };

  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      flush();
      current = match[1].trim();
      buffer = [];
      continue;
    }

    if (current) {
      buffer.push(line);
    }
  }

  flush();
  return sections;
};

const extractSubheadings = (sectionText) => {
  if (!sectionText) return [];
  return [...sectionText.matchAll(/^### (.+)$/gm)].map((match) => match[1].trim());
};

const extractNumberedList = (sectionText) => {
  if (!sectionText) return [];
  return [...sectionText.matchAll(/^\d+\.\s+(.+)$/gm)].map((match) => match[1].trim());
};

const slugify = (value) => value
  .toLowerCase()
  .replace(/`/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const backlogText = readBacklog();
const currentState = parseCurrentStateTable(backlogText);
const sections = extractSections(backlogText);
const generatedAt = formatPacificTimestamp();
const currentStateFreshness = describeStateFreshness(currentState, generatedAt);
const activeUngatedLaunchBlockers = extractSubheadings(sections['Current Launch Blockers'])
  .map((title) => title.replace(/^Critical \d+:\s*/, ''));
const nextThree = extractNumberedList(sections['Next 10 Tasks']).slice(0, 3);

const proofBoard = {
  generatedAt,
  source: BACKLOG_PATH,
  currentState,
  currentStateFreshness,
  readinessScore: currentState['Current readiness score'] ?? 'unknown',
  launchVerdict: currentState['Current launch verdict'] ?? 'unknown',
  productionReady: currentState['Production-ready'] ?? 'unknown',
  contractSummary: currentStateFreshness.status === 'FRESH'
    ? 'Proof board is current: this canonical launch-truth artifact depends on a fresh BACKLOG.md current-state block, while workflows only gate freshness and helper/local bundles regenerate the raw and markdown board outputs.'
    : 'Proof board is generated from stale current-state metadata: update BACKLOG.md before treating either proof:v1:board output as canonical launch truth.',
  activeUngatedLaunchBlockers,
  blockedOrApprovalGatedLaunchItems: currentState['Current blockers']
    ? [currentState['Current blockers']]
    : [],
  summary: {
    currentProofState: currentState['Current proof state'] ?? '',
    currentNextActions: currentState['Current next actions'] ?? '',
  },
  ruthlessNextThree: nextThree.map((title, index) => ({
    id: slugify(title),
    rank: index + 1,
    title,
    status: index === 0 ? 'READY_WHEN_SECURE_ENV_EXISTS' : 'PENDING_ON_PRIOR_STEP',
  })),
  sections,
};

const orderedMarkdownSections = [
  'Launch Question',
  'Current Canonical Status',
  'Current Launch Blockers',
  'Critical Resolved This Wave',
  'Non-Critical Before Launch',
  'Non-Critical After Launch / Deferred',
  'Validation Matrix',
  'Deployment Matrix',
  'Next 10 Tasks',
  'Resolved Work Summary',
  'What Changed In This Final Closeout',
];

const markdownMode = process.argv.includes('--markdown');
const requireFreshCurrentState = process.argv.includes('--require-fresh-current-state');
const freshnessOnlyMode = process.argv.includes('--freshness-only');

if (freshnessOnlyMode) {
  const freshnessLine = currentStateFreshness.warning || 'Current state metadata is fresh.';
  console.log(`[proof:v1:board] ${currentStateFreshness.status}: ${freshnessLine}`);
} else if (markdownMode) {
  console.log('# V1 Proof Board\n');
  console.log(`_Generated:_ ${proofBoard.generatedAt}`);
  console.log(`_Source:_ \`${BACKLOG_PATH}\`\n`);
  if (currentStateFreshness.warning) {
    console.log(`> Warning: ${currentStateFreshness.warning}\n`);
  }
  console.log('## Current State');
  for (const [key, value] of Object.entries(currentState)) {
    console.log(`- ${key}: ${value}`);
  }
  console.log('');

  for (const name of orderedMarkdownSections) {
    if (!sections[name]) continue;
    console.log(`## ${name}`);
    console.log(sections[name]);
    console.log('');
  }
} else {
  console.log(JSON.stringify(proofBoard, null, 2));
}

if (requireFreshCurrentState && currentStateFreshness.status !== 'FRESH') {
  console.error(
    `[proof:v1:board] Current state metadata is ${currentStateFreshness.status.toLowerCase()}; update BACKLOG.md before treating either proof:v1:board output as fresh launch truth.`,
  );
  process.exitCode = 1;
}
