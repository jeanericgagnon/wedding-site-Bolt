#!/usr/bin/env node

import fs from 'node:fs';

const BACKLOG_PATH = 'BACKLOG.md';

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

const readBacklog = () => fs.readFileSync(BACKLOG_PATH, 'utf8');

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
const activeUngatedLaunchBlockers = extractSubheadings(sections['Current Launch Blockers'])
  .map((title) => title.replace(/^Critical \d+:\s*/, ''));
const nextThree = extractNumberedList(sections['Next 10 Tasks']).slice(0, 3);

const proofBoard = {
  generatedAt: formatPacificTimestamp(),
  source: BACKLOG_PATH,
  currentState,
  readinessScore: currentState['Current readiness score'] ?? 'unknown',
  launchVerdict: currentState['Current launch verdict'] ?? 'unknown',
  productionReady: currentState['Production-ready'] ?? 'unknown',
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

if (process.argv.includes('--markdown')) {
  console.log('# V1 Proof Board\n');
  console.log(`_Generated:_ ${proofBoard.generatedAt}`);
  console.log(`_Source:_ \`${BACKLOG_PATH}\`\n`);
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
