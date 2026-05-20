#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-build-name-change-pdf-review-packet.mjs --population /tmp/dayof-name-change-population-plan.mapped.json --draft /tmp/dayof-name-change-draft-output-payload.json --fdf-manifest /tmp/name-change-fdf/dayof-name-change-fdf-export-manifest.json --output /tmp/dayof-name-change-pdf-review-packet.json',
    '',
    'The FDF manifest is optional, but including it lets the review packet point to the generated .fdf files.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    draftPath: null,
    fdfManifestPath: null,
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--population') {
      parsed.populationPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--draft') {
      parsed.draftPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--fdf-manifest') {
      parsed.fdfManifestPath = argv[index + 1] ?? null;
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

function validateDraftPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || payload.safePayload !== true || !Array.isArray(payload.items)) {
    throw new Error('Draft payload must include reviewOnly: true, safePayload: true, and an items array.');
  }
}

function validateFdfManifest(payload) {
  if (!payload) return;
  if (typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.exports)) {
    throw new Error('FDF manifest must be reviewOnly JSON with an exports array.');
  }
}

function findPopulationItem(populationPayload, draftItem) {
  return populationPayload.items.find((item) => (
    item.formCode === draftItem.formCode
    && item.officialRevisionLabel === draftItem.officialRevisionLabel
  )) ?? null;
}

function findFdfExport(fdfManifest, draftItem) {
  return fdfManifest?.exports?.find((item) => (
    item.formCode === draftItem.formCode
    && item.officialRevisionLabel === draftItem.officialRevisionLabel
  )) ?? null;
}

function getStatusLabel(status) {
  if (status === 'ready_for_review') return 'Ready for review';
  if (status === 'guided_online') return 'Guided online';
  return 'Blocked';
}

function buildFieldInstructions(assignments) {
  return assignments
    .filter((assignment) => assignment?.redactionPolicy === 'none' && typeof assignment.value === 'string')
    .map((assignment) => ({
      fieldKey: assignment.fieldKey,
      officialFieldLabel: assignment.officialFieldLabel,
      pdfFieldName: assignment.pdfFieldName,
      value: assignment.value,
      instruction: `Populate ${assignment.officialFieldLabel} in PDF field ${assignment.pdfFieldName}.`,
      copyInstruction: `Put "${assignment.value}" into PDF field "${assignment.pdfFieldName}" for ${assignment.officialFieldLabel}.`,
      reviewPrompt: `Confirm ${assignment.officialFieldLabel} reads ${assignment.value} before signing or submitting.`,
      reviewSteps: [
        `Locate PDF field "${assignment.pdfFieldName}" in the official PDF.`,
        `Confirm ${assignment.officialFieldLabel} should use "${assignment.value}".`,
        `Verify the draft shows "${assignment.value}" exactly before signing or submitting.`,
      ],
    }));
}

function getUnsafeAssignmentBlockers(assignments) {
  return assignments
    .filter((assignment) => assignment?.redactionPolicy !== 'none' || typeof assignment.value !== 'string')
    .map((assignment) => ({
      fieldKey: assignment.fieldKey ?? 'unknown',
      officialFieldLabel: assignment.officialFieldLabel ?? assignment.fieldKey ?? 'Unknown field',
      reason: `${assignment.officialFieldLabel ?? 'This field'} cannot be included in a review packet until it is cleared for a safe draft payload.`,
    }));
}

function buildReadyChecklist(populationItem, fdfFileName) {
  return [
    `Download the official PDF from ${populationItem.officialUrl}.`,
    `Confirm the downloaded PDF revision matches ${populationItem.officialRevisionLabel}.`,
    fdfFileName
      ? `Use ${fdfFileName} only to create a review draft from the official PDF.`
      : 'Create a review draft only after the FDF export is available.',
    'Review every populated field in the PDF before signing.',
    'Submit only through the official agency instructions for this form.',
  ];
}

function buildGuidedChecklist(populationItem) {
  return [
    populationItem?.officialUrl
      ? `Open the official agency flow at ${populationItem.officialUrl}.`
      : 'Open the official agency flow.',
    'Use DayOf values as copy guidance only.',
    'Review the agency confirmation page before submitting.',
  ];
}

function buildPacketItem(populationPayload, draftItem, fdfManifest) {
  const populationItem = findPopulationItem(populationPayload, draftItem);
  if (draftItem.status === 'guided_online') {
    return {
      formCode: draftItem.formCode,
      formLabel: draftItem.formLabel,
      officialUrl: populationItem?.officialUrl ?? null,
      officialRevisionLabel: draftItem.officialRevisionLabel,
      status: 'guided_online',
      statusLabel: getStatusLabel('guided_online'),
      fieldInstructions: [],
      blockers: [],
      fdfFileName: null,
      fillCommandTemplate: null,
      reviewChecklist: buildGuidedChecklist(populationItem),
      nextAction: 'Use DayOf as guided copy support while the user completes the official agency flow.',
    };
  }

  const metadataBlockers = populationItem ? [] : [{
    fieldKey: draftItem.formCode,
    officialFieldLabel: draftItem.formLabel,
    reason: 'Official source metadata is missing for this draft item.',
  }];
  const assignments = Array.isArray(draftItem.assignments) ? draftItem.assignments : [];
  const fieldInstructions = buildFieldInstructions(assignments);
  const blockers = [
    ...metadataBlockers,
    ...(Array.isArray(draftItem.blockers) ? draftItem.blockers : []),
    ...getUnsafeAssignmentBlockers(assignments),
  ];
  const fdfExport = findFdfExport(fdfManifest, draftItem);
  const status = draftItem.status === 'ready' && blockers.length === 0 && fieldInstructions.length > 0
    ? 'ready_for_review'
    : 'blocked';

  return {
    formCode: draftItem.formCode,
    formLabel: draftItem.formLabel,
    officialUrl: populationItem?.officialUrl ?? null,
    officialRevisionLabel: draftItem.officialRevisionLabel,
    status,
    statusLabel: getStatusLabel(status),
    fieldInstructions: status === 'ready_for_review' ? fieldInstructions : [],
    blockers,
    fdfFileName: status === 'ready_for_review' ? fdfExport?.fdfFileName ?? null : null,
    fillCommandTemplate: status === 'ready_for_review' ? fdfExport?.fillCommandTemplate ?? null : null,
    reviewChecklist: status === 'ready_for_review' && populationItem ? buildReadyChecklist(populationItem, fdfExport?.fdfFileName ?? null) : [],
    nextAction: status === 'ready_for_review'
      ? 'Generate the review draft, inspect each populated field, then sign or submit only through official instructions.'
      : blockers[0]?.reason ?? 'Resolve draft blockers before creating a review packet.',
  };
}

function getPrimaryAction(summary) {
  if (summary.readyPackets > 0) return 'Use ready review packets to create official-form drafts, then require user review before signing or submitting.';
  if (summary.blockedPackets > 0) return 'Resolve blocked draft fields before creating PDF review packets.';
  return 'Use guided online copy support for agency flows that do not expose a production PDF path.';
}

function buildReviewPacket(populationPayload, draftPayload, fdfManifest) {
  const items = draftPayload.items.map((item) => buildPacketItem(populationPayload, item, fdfManifest));
  const summary = {
    totalForms: items.length,
    readyPackets: items.filter((item) => item.status === 'ready_for_review').length,
    blockedPackets: items.filter((item) => item.status === 'blocked').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    fieldInstructions: items.reduce((sum, item) => sum + item.fieldInstructions.length, 0),
    fieldReviewSteps: items.reduce((sum, item) => (
      sum + item.fieldInstructions.reduce((fieldSum, field) => fieldSum + field.reviewSteps.length, 0)
    ), 0),
    reviewChecks: items.reduce((sum, item) => sum + item.reviewChecklist.length, 0),
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
  const { populationPath, draftPath, fdfManifestPath, outputPath } = parseArgs(process.argv.slice(2));
  if (!populationPath || !draftPath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const populationPayload = JSON.parse(await readFile(populationPath, 'utf8'));
  const draftPayload = JSON.parse(await readFile(draftPath, 'utf8'));
  const fdfManifest = fdfManifestPath ? JSON.parse(await readFile(fdfManifestPath, 'utf8')) : null;
  validatePopulationPayload(populationPayload);
  validateDraftPayload(draftPayload);
  validateFdfManifest(fdfManifest);
  const reviewPacket = buildReviewPacket(populationPayload, draftPayload, fdfManifest);
  const absoluteOutputPath = resolve(outputPath);
  await writeFile(absoluteOutputPath, JSON.stringify(reviewPacket, null, 2), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    safePayload: true,
    outputPath: absoluteOutputPath,
    summary: reviewPacket.summary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
