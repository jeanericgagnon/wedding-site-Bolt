#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

function parseArg(arg) {
  const [maybeFormCode, ...pathParts] = arg.split('=');
  if (pathParts.length === 0) {
    const filePath = maybeFormCode;
    return {
      formCode: basename(filePath).replace(/\.[^.]+$/, '').toUpperCase(),
      filePath,
    };
  }

  return {
    formCode: maybeFormCode.trim(),
    filePath: pathParts.join('=').trim(),
  };
}

function decodePdfLiteralString(value) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, escaped) => {
      if (escaped === 'n') return '\n';
      if (escaped === 'r') return '\r';
      if (escaped === 't') return '\t';
      if (escaped === 'b') return '\b';
      if (escaped === 'f') return '\f';
      return escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8)));
}

function decodePdfHexString(value) {
  const normalized = value.replace(/\s+/g, '');
  const pairs = normalized.match(/.{1,2}/g) ?? [];
  return pairs.map((pair) => String.fromCharCode(Number.parseInt(pair.padEnd(2, '0'), 16))).join('');
}

function extractRawAcroFormNames(buffer) {
  const text = buffer.toString('latin1');
  const names = new Set();
  const literalPattern = /\/T\s*\(((?:\\.|[^\\)])*)\)/g;
  const hexPattern = /\/T\s*<([0-9A-Fa-f\s]+)>/g;

  for (const match of text.matchAll(literalPattern)) {
    const decoded = decodePdfLiteralString(match[1] ?? '').trim();
    if (decoded) names.add(decoded);
  }

  for (const match of text.matchAll(hexPattern)) {
    const decoded = decodePdfHexString(match[1] ?? '').trim();
    if (decoded) names.add(decoded);
  }

  return Array.from(names).sort((left, right) => left.localeCompare(right));
}

async function probeFile(arg) {
  const { formCode, filePath } = parseArg(arg);
  const buffer = await readFile(filePath);
  const fieldNames = extractRawAcroFormNames(buffer);

  return {
    formCode,
    filePath,
    fieldCount: fieldNames.length,
    fieldNames,
    probeStatus: fieldNames.length > 0 ? 'raw_fields_found' : 'needs_pdf_field_inspector',
    note: fieldNames.length > 0
      ? 'Raw /T AcroForm names were found. Confirm them against the visual form before production mapping.'
      : 'No raw /T AcroForm names were found. The PDF may be flattened, compressed, XFA-based, or need qpdf/pdftk/browser inspection.',
  };
}

async function main() {
  const args = process.argv.slice(2).filter(Boolean);

  if (args.length === 0) {
    console.error('Usage: node scripts/v1-probe-name-change-pdf-fields.mjs SSA-SS5=/path/ss-5.pdf DS-82=/path/ds82_pdf.PDF');
    process.exitCode = 1;
    return;
  }

  const results = [];
  for (const arg of args) {
    try {
      results.push(await probeFile(arg));
    } catch (error) {
      results.push({
        formCode: parseArg(arg).formCode,
        filePath: parseArg(arg).filePath,
        fieldCount: 0,
        fieldNames: [],
        probeStatus: 'probe_failed',
        note: error instanceof Error ? error.message : 'Unknown PDF probe failure.',
      });
    }
  }

  console.log(JSON.stringify({
    reviewOnly: true,
    generatedAt: new Date().toISOString(),
    results,
  }, null, 2));
}

await main();
