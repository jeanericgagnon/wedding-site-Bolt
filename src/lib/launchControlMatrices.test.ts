import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const backlog = readFileSync('BACKLOG.md', 'utf8');

function parseTable(sectionHeading: string): Array<Record<string, string>> {
  const lines = backlog.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim() === sectionHeading);
  expect(headingIndex).toBeGreaterThanOrEqual(0);

  const tableLines: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('|')) {
      if (tableLines.length > 0) break;
      continue;
    }
    tableLines.push(line);
  }

  expect(tableLines.length).toBeGreaterThanOrEqual(3);
  const headers = tableLines[0]
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());

  return tableLines
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === headers.length)
    .map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]])));
}

describe('launch control backlog matrices', () => {
  it('keeps the validation matrix canonical and complete for launch-critical commands', () => {
    const rows = parseTable('## Validation Matrix');
    const byCommand = new Map(rows.map((row) => [row['Command'], row]));
    const requiredCommands = [
      '`npm run typecheck -- --pretty false`',
      '`npm run lint -- --quiet`',
      '`npm run build`',
      '`npm test`',
      '`npm run test:security`',
      '`npm run test:smoke`',
      '`npm run proof:v1:public-access-coverage`',
      'public DTO leak tests',
      '`npm run proof:v1:guest-lookup-scope`',
      '`npm run proof:v1:registry-preview-ssrf`',
      '`npm run proof:v1:service-role-authorization`',
      '`npm run proof:v1:email-messaging-authorization`',
      '`npm run proof:v1:launch-closeout`',
      '`PLAYWRIGHT_BASE_URL=https://dayof.love npm run proof:v1:canonical-smoke`',
      '`PLAYWRIGHT_BASE_URL=https://dayof.love npm run test:e2e:public-quality`',
      '`npm run proof:v1:guests-rsvp-ops`',
      '`npm run guard:file-size`',
      '`npm run guard:assets`',
      '`npm run proof:v1:performance-budget`',
      '`git diff --check`',
    ];
    const allowedStatuses = new Set(['`PASS`', '`FAIL`', '`NOT RUN`', '`LOCAL ONLY`', '`LIVE PASS`', '`SECURE ENV REQUIRED`']);

    for (const command of requiredCommands) {
      expect(byCommand.has(command), `missing validation row for ${command}`).toBe(true);
    }

    for (const row of rows) {
      expect(allowedStatuses.has(row['Status']), `invalid validation status for ${row['Command']}: ${row['Status']}`).toBe(true);
    }
  });

  it('keeps the deployment matrix canonical and complete for launch-critical surfaces', () => {
    const rows = parseTable('## Deployment Matrix');
    const bySurface = new Map(rows.map((row) => [row['Surface'], row]));
    const requiredSurfaces = [
      'Vercel frontend',
      '`public-site-access`',
      '`public-registry-items`',
      '`public-itinerary-by-slug`',
      '`validate-rsvp-token`',
      '`public-site-rsvp-submit`',
      '`guest-contact-lookup`',
      '`guestbook-submit`',
      '`photo-upload`',
      '`vault-entry-submit`',
      '`interactive-section-public`',
      '`vault-contribution-public`',
      '`registry-preview`',
      '`send-wedding-email`',
      '`send-bulk-message`',
      '`process-email-queue`',
      '`queue-guest-followups`',
      'storage/media functions',
      'AI/provider functions',
    ];
    const allowedStatuses = new Set(['`LIVE PASS`', '`PASS`', '`PARTIAL`', '`UNVERIFIED`', '`LOCAL ONLY`', '`PUSHED ONLY`']);

    for (const surface of requiredSurfaces) {
      expect(bySurface.has(surface), `missing deployment row for ${surface}`).toBe(true);
    }

    for (const row of rows) {
      expect(allowedStatuses.has(row['Status']), `invalid deployment status for ${row['Surface']}: ${row['Status']}`).toBe(true);
    }
  });
});
