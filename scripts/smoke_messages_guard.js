#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routeSource = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/Messages.tsx'), 'utf8');
const deliveryActionsSource = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/messages/useMessageDeliveryActions.ts'), 'utf8');
const historyActionsSource = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/messages/useMessageComposerHistoryActions.ts'), 'utf8');
const viewComponentsSource = readFileSync(resolve(process.cwd(), 'src/pages/dashboard/messages/MessageDashboardComponents.tsx'), 'utf8');

const checks = [
  { name: 'compose permission helper imported', ok: routeSource.includes('canComposeDashboardMessages') },
  { name: 'route computes canCompose once and passes it into delivery/history surfaces', ok: routeSource.includes('const canCompose = canComposeDashboardMessages(messagesRole, messagesPermissions);') && routeSource.includes('canCompose,') },
  { name: 'composer load is permission-gated', ok: historyActionsSource.includes("Your collaborator role cannot edit campaigns from Messaging.") },
  { name: 'follow-up creation is permission-gated', ok: historyActionsSource.includes("cannot create follow-up campaigns from Messaging") },
  { name: 'scheduled follow-up creation is permission-gated', ok: historyActionsSource.includes("cannot schedule follow-up campaigns from Messaging") },
  { name: 'retry path is permission-gated', ok: deliveryActionsSource.includes("cannot retry campaign sends") },
  { name: 'send-now path is permission-gated', ok: deliveryActionsSource.includes("cannot send campaigns from Messaging") },
  { name: 'reschedule path is permission-gated', ok: deliveryActionsSource.includes("cannot reschedule campaigns") },
  { name: 'unschedule path is permission-gated', ok: deliveryActionsSource.includes("cannot change scheduled campaigns") },
  { name: 'run-due-scheduled path is permission-gated', ok: deliveryActionsSource.includes("cannot run scheduled sends") },
  { name: 'compose-disabled controls remain disabled in the view', ok: viewComponentsSource.includes('disabled={!canCompose}') && viewComponentsSource.includes('Viewer mode is on, so writing and sending are turned off.') },
];

const failures = checks.filter((check) => !check.ok);
if (failures.length) {
  console.error('messages guard failed');
  failures.forEach((failure) => console.error(`- ${failure.name}`));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, checks: checks.map((check) => check.name) }, null, 2));
