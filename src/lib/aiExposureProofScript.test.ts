import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AI exposure proof script', () => {
  const parseJsonOutput = (text: string) => {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    return JSON.parse(text.slice(start, end + 1)) as {
      launchCleared?: boolean;
      mode?: string;
      summary?: { total?: number; passed?: number; failed?: number };
      static?: { failures?: Array<{ id: string }> };
      blockers?: string[];
    };
  };

  it('is wired into the proof commands and keeps live secret readback explicit', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
    const script = readFileSync('scripts/v1-proof-ai-exposure.mjs', 'utf8');
    const rolloutScript = readFileSync('scripts/v1-proof-ai-rollout.mjs', 'utf8');
    const clearanceScript = readFileSync('scripts/v1-proof-ai-clearance.mjs', 'utf8');
    const migrationReadyScript = readFileSync('scripts/v1-proof-ai-migration-ready.mjs', 'utf8');
    const deployGuard = readFileSync('scripts/deploy_prod_guarded.mjs', 'utf8');
    const postdeployProof = readFileSync('scripts/v1-postdeploy-proof.mjs', 'utf8');

    expect(packageJson.scripts?.['proof:v1:ai-exposure']).toBe('node scripts/v1-proof-ai-exposure.mjs');
    expect(packageJson.scripts?.['proof:v1:ai-rollout']).toBe('node scripts/v1-proof-ai-rollout.mjs');
    expect(packageJson.scripts?.['proof:v1:ai-clearance']).toBe('node scripts/v1-proof-ai-clearance.mjs');
    expect(packageJson.scripts?.['proof:v1:ai-migration-ready']).toBe('node scripts/v1-proof-ai-migration-ready.mjs');
    expect(deployGuard).toContain('npm run proof:v1:ai-rollout');
    expect(deployGuard).toContain('npm run proof:v1:postdeploy');
    expect(deployGuard).toContain('Postdeploy proof is mandatory');
    expect(deployGuard).not.toContain('postdeploy proof skipped by SKIP_POSTDEPLOY_PROOF=1');
    expect(deployGuard).toContain("process.env.PLAYWRIGHT_BASE_URL || 'https://dayof.love'");
    expect(postdeployProof).toContain('npm run proof:v1:ai-rollout');
    expect(postdeployProof).toContain('npm run proof:v1:ai-exposure');
    expect(postdeployProof).toContain("V1_AI_ROLLOUT_LIVE: '1'");
    expect(rolloutScript).toContain('V1_AI_ROLLOUT_LIVE');
    expect(rolloutScript).toContain('sourcesWithAiPhotoTables');
    expect(clearanceScript).toContain('V1_AI_CLEARANCE_LIVE');
    expect(clearanceScript).toContain('launchCleared');
    expect(clearanceScript).toContain('migrationReadiness');
    expect(clearanceScript).toContain('frontend_ready_migration_pending');
    expect(clearanceScript).toContain('authenticatedReadbackReady');
    expect(clearanceScript).toContain('Production bundle is not migration-ready yet');
    expect(migrationReadyScript).toContain('safeToApplyMigration');
    expect(migrationReadyScript).toContain('frontend_ready_migration_pending');
    expect(migrationReadyScript).toContain('authenticatedReadbackReady');
    expect(migrationReadyScript).toContain('expectedPendingSensitiveFailures');
    expect(migrationReadyScript).toContain('20260503100000_harden_ai_photo_column_privileges.sql');
    expect(postdeployProof).toContain('V1_POSTDEPLOY_STEP_TIMEOUT_MS');
    expect(postdeployProof).toContain('[postdeploy] starting');
    expect(script).toMatch(/V1_AI_EXPOSURE_LIVE/);
    expect(script).toMatch(/V1_AI_EXPOSURE_LIVE_STRICT/);
    expect(script).toMatch(/V1_OWNER_EMAIL/);
    expect(script).toMatch(/V1_OWNER_PASSWORD/);
    expect(script).toContain('grantColumns');
    expect(script).toContain('safe-column-grant-exact');
    expect(script).toContain('no-anon-column-grant');
    expect(script).toContain('laterMigrationStaticChecks');
    expect(script).toContain('no-later-broad-grant');
    expect(rolloutScript).toContain('Deploy frontend code that no longer selects AI/photo sensitive columns');
    expect(rolloutScript).toContain('20260503100000_harden_ai_photo_column_privileges.sql');
    expect(script).not.toMatch(/console\.log\([^)]*(password|accessToken|anonKey|serviceRoleKey)/i);
    expect(rolloutScript).not.toMatch(/console\.log\([^)]*(password|accessToken|anonKey|serviceRoleKey)/i);
  });

  it('fails static exposure proof when a later migration reopens sensitive AI/photo table reads', () => {
    const tmpRoot = mkdtempSync(join(tmpdir(), 'dayof-ai-exposure-proof-'));
    mkdirSync(join(tmpRoot, 'scripts'), { recursive: true });
    mkdirSync(join(tmpRoot, 'supabase/migrations'), { recursive: true });
    mkdirSync(join(tmpRoot, 'src/lib'), { recursive: true });
    mkdirSync(join(tmpRoot, 'tests/e2e'), { recursive: true });

    for (const filePath of [
      'scripts/v1-proof-ai-exposure.mjs',
      'supabase/migrations/20260503100000_harden_ai_photo_column_privileges.sql',
      'src/lib/aiProviderKeySecurity.test.ts',
      'tests/e2e/photo-upload-write-read.spec.ts',
    ]) {
      writeFileSync(join(tmpRoot, filePath), readFileSync(filePath, 'utf8'));
    }
    writeFileSync(
      join(tmpRoot, 'supabase/migrations/20260503101000_bad_later_ai_grant.sql'),
      'GRANT SELECT ON public.photo_upload_ai_analysis TO anon;\n',
    );

    let stdout = '';
    try {
      execFileSync('node', ['scripts/v1-proof-ai-exposure.mjs'], {
        cwd: tmpRoot,
        encoding: 'utf8',
      });
      throw new Error('Expected later broad grant to fail static AI exposure proof.');
    } catch (error) {
      stdout = typeof (error as { stdout?: unknown }).stdout === 'string'
        ? ((error as { stdout: string }).stdout)
        : Buffer.isBuffer((error as { stdout?: unknown }).stdout)
          ? ((error as { stdout: Buffer }).stdout).toString('utf8')
          : '';
    }

    const output = parseJsonOutput(stdout);
    expect(output.static?.failures?.some((failure) => failure.id.includes('no-later-broad-grant'))).toBe(true);
  });

  it('checks every sensitive AI/photo table and keeps the hardening migration in prereqs', () => {
    const script = readFileSync('scripts/v1-proof-ai-exposure.mjs', 'utf8');
    const prereqs = readFileSync('scripts/v1-proof-prereqs.mjs', 'utf8');

    for (const table of [
      'photo_upload_ai_analysis',
      'photo_upload_metadata',
      'photo_ai_bucket_corrections',
      'internal_ai_usage_events',
    ]) {
      expect(script, table).toContain(table);
    }

    for (const column of [
      'provider',
      'model',
      'raw_result',
      'raw_usage',
      'estimated_cost_usd',
      'raw_exif',
      'gps_lat',
      'gps_lng',
      'gps_altitude',
    ]) {
      expect(script, column).toContain(column);
    }

    expect(prereqs).toContain('20260503100000_harden_ai_photo_column_privileges.sql');
    expect(prereqs).toContain('requiredProofScripts');
    expect(prereqs).toContain('proof:v1:ai-migration-ready');
    expect(prereqs).toContain('requiredProofScriptsFailing');
    expect(prereqs).toContain('safeToApplyMigration: true');
    expect(prereqs).toContain('frontend_ready_migration_pending');
  });

  it('keeps local AI clearance useful but not launch-clearing without live gates', () => {
    let stdout = '';
    try {
      execFileSync('node', ['scripts/v1-proof-ai-clearance.mjs'], {
        encoding: 'utf8',
        env: { ...process.env, V1_AI_CLEARANCE_LIVE: '' },
      });
      throw new Error('Expected local-only clearance to exit nonzero.');
    } catch (error) {
      stdout = typeof (error as { stdout?: unknown }).stdout === 'string'
        ? ((error as { stdout: string }).stdout)
        : Buffer.isBuffer((error as { stdout?: unknown }).stdout)
          ? ((error as { stdout: Buffer }).stdout).toString('utf8')
          : '';
    }

    const output = parseJsonOutput(stdout);
    expect(output.launchCleared).toBe(false);
    expect(output.mode).toBe('local_only_not_launch_clearance');
    expect(output.summary).toMatchObject({ total: 2, passed: 2, failed: 0 });
    expect(output.blockers?.join('\n')).toContain('Run with V1_AI_CLEARANCE_LIVE=1');
  });
});
