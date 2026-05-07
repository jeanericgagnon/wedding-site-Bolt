import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  MAX_MESSAGE_DELIVERY_MESSAGE_IDS,
  MAX_MESSAGE_DELIVERY_ROWS,
} from './messageService';

describe('message service query bounds', () => {
  it('exports stable delivery query caps', () => {
    expect(MAX_MESSAGE_DELIVERY_MESSAGE_IDS).toBe(50);
    expect(MAX_MESSAGE_DELIVERY_ROWS).toBe(1000);
  });

  it('keeps delivery history reads bounded for dashboard usage', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/messages/messageService.ts'), 'utf8');

    expect(source).toContain('const scopedMessageIds = Array.from(new Set(messageIds)).slice(0, MAX_MESSAGE_DELIVERY_MESSAGE_IDS);');
    expect(source).toContain(".in('message_id', scopedMessageIds)");
    expect(source).toContain('.limit(MAX_MESSAGE_DELIVERY_ROWS);');
  });
});
