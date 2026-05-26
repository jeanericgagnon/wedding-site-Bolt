import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPreview(url, timeoutMs = 60_000, getStartupFailureMessage = () => '') {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const startupFailureMessage = getStartupFailureMessage();
    if (startupFailureMessage) throw new Error(startupFailureMessage);

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_500) });
      if (response.ok) return;
    } catch {
      // Keep waiting for the preview runtime.
    }
    await sleep(500);
  }
  throw new Error(`Preview server did not become ready at ${url} within ${timeoutMs}ms`);
}

function checkLocalPortAvailability(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.on('error', (error) => resolve({
      available: false,
      error,
    }));
    server.listen({ host: '127.0.0.1', port }, () => {
      server.close(() => resolve({
        available: true,
        error: null,
      }));
    });
  });
}

export async function findOpenLocalPort(
  preferredPort,
  maxAttempts = 100,
  portAvailabilityCheck = checkLocalPortAvailability,
) {
  const bindingFailures = [];
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset;
    const result = await portAvailabilityCheck(port);
    if (result.available) return port;
    if (result.error && result.error.code !== 'EADDRINUSE') {
      bindingFailures.push({
        port,
        code: result.error.code,
        message: result.error.message,
      });
    }
  }

  if (bindingFailures.length > 0) {
    const { port, code, message } = bindingFailures[0];
    throw new Error(
      `Could not bind a local preview port starting at ${preferredPort}. First failure: ${code ?? 'UNKNOWN'} on ${port}${message ? ` (${message})` : ''}`,
    );
  }

  throw new Error(`No available local preview port found from ${preferredPort} through ${preferredPort + maxAttempts - 1}`);
}

export async function resolvePreviewRuntime({
  preferredPort,
  requestedBaseUrl,
  cwd,
  startupTimeoutMs = 60_000,
}) {
  const managedBaseUrl = `http://127.0.0.1:${preferredPort}`;
  const port = requestedBaseUrl && requestedBaseUrl !== managedBaseUrl
    ? preferredPort
    : await findOpenLocalPort(preferredPort);
  const baseUrl = requestedBaseUrl && requestedBaseUrl !== managedBaseUrl
    ? requestedBaseUrl
    : `http://127.0.0.1:${port}`;

  if (requestedBaseUrl && requestedBaseUrl !== managedBaseUrl) {
    return {
      baseUrl: requestedBaseUrl,
      previewProcess: null,
      previewOutput: { stdout: '', stderr: '' },
    };
  }

  const previewOutput = { stdout: '', stderr: '' };
  const previewProcess = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], {
    cwd,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  previewProcess.stdout.on('data', (chunk) => {
    previewOutput.stdout += chunk.toString('utf8');
  });
  previewProcess.stderr.on('data', (chunk) => {
    previewOutput.stderr += chunk.toString('utf8');
  });

  await waitForPreview(baseUrl, startupTimeoutMs, () => {
    if (previewProcess.exitCode === null && previewProcess.signalCode === null) return '';
    const output = [previewOutput.stderr.trim(), previewOutput.stdout.trim()].filter(Boolean).join('\n');
    return [
      `Preview server exited before becoming ready at ${baseUrl}.`,
      output || `Exit code: ${previewProcess.exitCode ?? 'unknown'}${previewProcess.signalCode ? `, signal: ${previewProcess.signalCode}` : ''}`,
    ].join('\n');
  });

  return {
    baseUrl,
    previewProcess,
    previewOutput,
  };
}

export async function stopPreviewRuntime(previewProcess) {
  if (!previewProcess) return;

  previewProcess.kill('SIGTERM');
  await sleep(300);
  if (!previewProcess.killed) previewProcess.kill('SIGKILL');
}
