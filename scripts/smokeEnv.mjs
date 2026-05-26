import fs from 'node:fs';

export const normalizeEnvValue = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/[\r\n]+/g, '').replace(/\\n/g, '').replace(/\\r/g, '');
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

export const loadEnvFile = (path) => (fs.existsSync(path)
  ? Object.fromEntries(
      fs.readFileSync(path, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), normalizeEnvValue(line.slice(separator + 1))];
        }),
    )
  : {});

export const loadSmokeEnv = () => ({
  ...loadEnvFile('.env'),
  ...loadEnvFile('.env.local'),
});
