#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-draft-output.mjs --population /path/dayof-name-change-population-plan.mapped.json --output /tmp/dayof-name-change-draft-output-payload.json',
    '',
    'Use this after applying a reviewed PDF adapter catalog to an exported population plan.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--population') {
      parsed.populationPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--output') {
      parsed.outputPath = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return parsed;
}

function validatePopulationPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.items)) {
    throw new Error('Population payload must be reviewOnly JSON with an items array.');
  }
}

function getSensitiveBlockerReason(field) {
  if (field.redactionPolicy === 'requires_secure_session') {
    return `${field.officialFieldLabel} requires a secure-session value handoff before it can be placed into a draft.`;
  }

  return `${field.officialFieldLabel} requires explicit consent before the saved sensitive value can be placed into a draft.`;
}

function buildFieldBlockers(field) {
  if (field.mappingStatus !== 'mapped') {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: `${field.officialFieldLabel} is not mapped to a PDF field yet.`,
    }];
  }
  if (!field.hasValue) {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: `${field.officialFieldLabel} does not have a usable value yet.`,
    }];
  }
  if (field.redactionPolicy !== 'none') {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: getSensitiveBlockerReason(field),
    }];
  }
  if (!field.value) {
    return [{
      fieldKey: field.fieldKey,
      officialFieldLabel: field.officialFieldLabel,
      reason: `${field.officialFieldLabel} is not present in the safe draft payload.`,
    }];
  }

  return [];
}

function buildAssignment(field) {
  if (field.mappingStatus !== 'mapped' || !field.adapterFieldName || field.redactionPolicy !== 'none' || !field.value) {
    return null;
  }

  return {
    fieldKey: field.fieldKey,
    officialFieldLabel: field.officialFieldLabel,
    pdfFieldName: field.adapterFieldName,
    value: field.value,
    source: 'saved_value',
    redactionPolicy: field.redactionPolicy,
  };
}

function getStatusLabel(status) {
  if (status === 'ready') return 'Draft payload ready';
  if (status === 'guided_online') return 'Guided online';
  return 'Blocked';
}

function getNextAction(status, blockers) {
  if (status === 'ready') return 'Send these PDF field assignments to a review-only PDF filler, then require user review before signing or submitting.';
  if (status === 'guided_online') return 'Use the population plan as copy guidance while the user completes the official agency flow.';
  return blockers[0]?.reason ?? 'Resolve population blockers before generating a draft payload.';
}

function buildDraftItem(item) {
  if (item.adapterKind === 'guided_online_entry') {
    return {
      formCode: item.formCode,
      formLabel: item.formLabel,
      officialRevisionLabel: item.officialRevisionLabel,
      status: 'guided_online',
      statusLabel: getStatusLabel('guided_online'),
      assignments: [],
      blockers: [],
      nextAction: getNextAction('guided_online', []),
    };
  }

  const fieldMappings = Array.isArray(item.fieldMappings) ? item.fieldMappings : [];
  const assignments = fieldMappings.map(buildAssignment).filter(Boolean);
  const fieldBlockers = fieldMappings.flatMap(buildFieldBlockers);
  const itemBlockers = item.status === 'ready_for_population' ? [] : (item.blockers ?? []).map((reason) => ({
    fieldKey: item.formCode,
    officialFieldLabel: item.formLabel,
    reason,
  }));
  const blockers = [...itemBlockers, ...fieldBlockers];
  const status = blockers.length === 0 ? 'ready' : 'blocked';

  return {
    formCode: item.formCode,
    formLabel: item.formLabel,
    officialRevisionLabel: item.officialRevisionLabel,
    status,
    statusLabel: getStatusLabel(status),
    assignments,
    blockers,
    nextAction: getNextAction(status, blockers),
  };
}

function getPrimaryAction(summary) {
  if (summary.blockedDrafts > 0) return 'Resolve blocked fields before generating filled review drafts.';
  if (summary.readyDrafts > 0) return 'Generate review-only PDF draft payloads and require user review before signing or submitting.';
  return 'Use guided online entry for the current agency flows.';
}

function buildDraftPayload(populationPayload) {
  const items = populationPayload.items.map(buildDraftItem);
  const summary = {
    totalForms: items.length,
    readyDrafts: items.filter((item) => item.status === 'ready').length,
    blockedDrafts: items.filter((item) => item.status === 'blocked').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    assignments: items.reduce((sum, item) => sum + item.assignments.length, 0),
    blockedFields: items.reduce((sum, item) => sum + item.blockers.length, 0),
  };

  return {
    reviewOnly: true,
    safePayload: true,
    generatedAt: new Date().toISOString(),
    primaryAction: getPrimaryAction(summary),
    summary,
    items,
  };
}

async function main() {
  const { populationPath, outputPath } = parseArgs(process.argv.slice(2));
  if (!populationPath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const populationPayload = JSON.parse(await readFile(populationPath, 'utf8'));
  validatePopulationPayload(populationPayload);
  const draftPayload = buildDraftPayload(populationPayload);
  const absoluteOutputPath = resolve(outputPath);
  await writeFile(absoluteOutputPath, JSON.stringify(draftPayload, null, 2), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    outputPath: absoluteOutputPath,
    summary: draftPayload.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
