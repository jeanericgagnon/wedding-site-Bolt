#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function usage() {
  return [
    'Usage:',
    '  node scripts/v1-apply-name-change-pdf-adapter-catalog.mjs --population /path/dayof-name-change-population-plan.json --catalog /path/name-change-pdf-adapter-catalog.json --output /tmp/dayof-name-change-population-plan.mapped.json',
    '',
    'Use this after promoting a reviewed PDF adapter template to a catalog.',
  ].join('\n');
}

function parseArgs(argv) {
  const parsed = {
    populationPath: null,
    catalogPath: null,
    outputPath: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--population') {
      parsed.populationPath = argv[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (arg === '--catalog') {
      parsed.catalogPath = argv[index + 1] ?? null;
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

function validateCatalogPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.reviewOnly !== true || !Array.isArray(payload.adapters)) {
    throw new Error('Adapter catalog must be reviewOnly JSON with an adapters array.');
  }
  if (Array.isArray(payload.issues) && payload.issues.length > 0) {
    throw new Error('Adapter catalog still has unresolved issues.');
  }
}

function getStatusLabel(status) {
  if (status === 'needs_input') return 'Needs info';
  if (status === 'needs_secure_session') return 'Needs secure session';
  if (status === 'needs_adapter_mapping') return 'Needs PDF mapping';
  if (status === 'guided_online') return 'Guided online';
  return 'Ready for population';
}

function findMapping(catalogPayload, item, field) {
  const adapter = catalogPayload.adapters.find((entry) => (
    entry.formCode === item.formCode
    && entry.officialRevisionLabel === item.officialRevisionLabel
  ));

  return adapter?.fieldMappings?.find((mapping) => mapping.fieldKey === field.fieldKey) ?? null;
}

function getMappedNote(field, mapping) {
  const confidenceLabel = mapping.confidence === 'verified_probe' ? 'verified by PDF probe' : 'needs manual review';
  return [
    `${field.officialFieldLabel} is mapped to PDF field ${mapping.pdfFieldName} (${confidenceLabel}).`,
    mapping.note,
  ].filter(Boolean).join(' ');
}

function applyField(item, field, catalogPayload) {
  if (field.mappingStatus === 'blocked' || item.adapterKind !== 'official_pdf_fill') {
    return {
      field,
      applied: false,
    };
  }

  const mapping = findMapping(catalogPayload, item, field);
  if (!mapping) {
    return {
      field,
      applied: false,
    };
  }

  return {
    field: {
      ...field,
      adapterFieldName: mapping.pdfFieldName,
      adapterMappingConfidence: mapping.confidence,
      mappingStatus: 'mapped',
      note: getMappedNote(field, mapping),
    },
    applied: field.mappingStatus !== 'mapped' || field.adapterFieldName !== mapping.pdfFieldName,
  };
}

function getItemStatus(item, fieldMappings) {
  if (item.status === 'needs_input' || item.status === 'needs_secure_session' || item.status === 'guided_online') {
    return item.status;
  }
  if (fieldMappings.some((field) => field.mappingStatus === 'needs_pdf_field_probe')) return 'needs_adapter_mapping';
  if (fieldMappings.some((field) => field.mappingStatus === 'blocked')) return 'needs_input';
  return 'ready_for_population';
}

function getNextAction(item, status, fieldMappings) {
  if (status === 'needs_input') return item.blockers?.[0] ?? 'Collect missing user information before population.';
  if (status === 'needs_secure_session') return item.nextAction;
  if (status === 'guided_online') return 'Use the fill payload as copy guidance while the user completes the official online flow.';
  if (status === 'needs_adapter_mapping') {
    const firstUnmappedField = fieldMappings.find((field) => field.mappingStatus === 'needs_pdf_field_probe');
    return firstUnmappedField
      ? `Map ${firstUnmappedField.officialFieldLabel} to an official PDF field name before generating a filled draft.`
      : 'Review the official source/version before enabling a production population adapter.';
  }

  return 'Generate a review-only draft, then require the user to inspect, sign, and submit through official instructions.';
}

function getPrimaryAction(summary) {
  if (summary.needsInput > 0) return 'Collect the missing user information first, then refresh the population plan.';
  if (summary.needsSecureSession > 0) return 'Collect secure-session-only values before generating review drafts.';
  if (summary.needsAdapterMapping > 0) return 'Probe official PDF field names for the PDF candidates before generating filled PDFs.';
  if (summary.guidedOnline > 0) return 'Use guided online copy support for agency flows that do not expose a production PDF path.';
  return 'Generate review-only draft outputs and require user review before submission.';
}

function applyCatalog(populationPayload, catalogPayload) {
  let appliedMappings = 0;
  const items = populationPayload.items.map((item) => {
    const fieldMappings = (item.fieldMappings ?? []).map((field) => {
      const result = applyField(item, field, catalogPayload);
      if (result.applied) appliedMappings += 1;
      return result.field;
    });
    const status = getItemStatus(item, fieldMappings);

    return {
      ...item,
      status,
      statusLabel: getStatusLabel(status),
      nextAction: getNextAction(item, status, fieldMappings),
      fieldMappings,
    };
  });
  const summary = {
    totalForms: items.length,
    readyForPopulation: items.filter((item) => item.status === 'ready_for_population').length,
    needsAdapterMapping: items.filter((item) => item.status === 'needs_adapter_mapping').length,
    guidedOnline: items.filter((item) => item.status === 'guided_online').length,
    needsInput: items.filter((item) => item.status === 'needs_input').length,
    needsSecureSession: items.filter((item) => item.status === 'needs_secure_session').length,
    pdfFillCandidates: items.filter((item) => item.adapterKind === 'official_pdf_fill').length,
  };
  const applySummary = {
    ...summary,
    appliedMappings,
    unmappedFields: items.reduce((sum, item) => (
      sum + (item.fieldMappings ?? []).filter((field) => field.mappingStatus === 'needs_pdf_field_probe').length
    ), 0),
  };

  return {
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    primaryAction: getPrimaryAction(summary),
    summary,
    applySummary,
    items,
  };
}

async function main() {
  const { populationPath, catalogPath, outputPath } = parseArgs(process.argv.slice(2));
  if (!populationPath || !catalogPath || !outputPath) {
    console.error(usage());
    process.exitCode = 1;
    return;
  }

  const populationPayload = JSON.parse(await readFile(populationPath, 'utf8'));
  const catalogPayload = JSON.parse(await readFile(catalogPath, 'utf8'));
  validatePopulationPayload(populationPayload);
  validateCatalogPayload(catalogPayload);
  const refreshedPopulation = applyCatalog(populationPayload, catalogPayload);
  const absoluteOutputPath = resolve(outputPath);
  await writeFile(absoluteOutputPath, JSON.stringify(refreshedPopulation, null, 2), 'utf8');

  console.log(JSON.stringify({
    reviewOnly: true,
    outputPath: absoluteOutputPath,
    summary: refreshedPopulation.applySummary,
  }, null, 2));
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
