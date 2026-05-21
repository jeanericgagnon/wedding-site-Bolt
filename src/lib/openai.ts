import { z } from 'zod';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

const getEnvValue = (key: string) => {
  const viteValue = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : undefined;
  const processValue = typeof process !== 'undefined' ? process.env[key] : undefined;
  return (viteValue || processValue || '').trim();
};

const getOpenAiApiKey = () => getEnvValue('OPENAI_API_KEY');
const getOpenAiModel = () => getEnvValue('OPENAI_MODEL') || 'gpt-4.1-mini';

export const isOpenAiForcedOff = () => getEnvValue('VITE_FORCE_DETERMINISTIC_AI') === 'true' || getEnvValue('VITEST') === 'true';
export const isOpenAiConfigured = () => Boolean(getOpenAiApiKey()) && !isOpenAiForcedOff();
export const getOpenAiRuntimeConfig = () => ({
  configured: isOpenAiConfigured(),
  forcedOff: isOpenAiForcedOff(),
  model: getOpenAiModel(),
});

export class OpenAiNotConfiguredError extends Error {
  constructor() {
    super('OpenAI API key is not configured. Set OPENAI_API_KEY to enable model-backed intelligence.');
  }
}

const extractResponseText = (payload: unknown): string => {
  const record = (payload && typeof payload === 'object') ? payload as Record<string, unknown> : {};

  if (typeof record.output_text === 'string' && record.output_text.trim()) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output as Array<Record<string, unknown>> : [];
  const textParts: string[] = [];

  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content as Array<Record<string, unknown>> : [];
    for (const entry of content) {
      if (typeof entry.text === 'string' && entry.text.trim()) {
        textParts.push(entry.text);
        continue;
      }

      const maybeText = entry.text;
      if (maybeText && typeof maybeText === 'object' && typeof (maybeText as Record<string, unknown>).value === 'string') {
        textParts.push((maybeText as Record<string, unknown>).value as string);
      }
    }
  }

  return textParts.join('\n').trim();
};

type StructuredPromptOptions<TSchema extends z.ZodTypeAny> = {
  system: string;
  user: string;
  schemaName: string;
  schema: TSchema;
  model?: string;
};

export async function runOpenAiStructuredPrompt<TSchema extends z.ZodTypeAny>({
  system,
  user,
  schemaName,
  schema,
  model = getOpenAiModel(),
}: StructuredPromptOptions<TSchema>): Promise<z.infer<TSchema>> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new OpenAiNotConfiguredError();

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: system }] },
        { role: 'user', content: [{ type: 'input_text', text: user }] },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: schemaName,
          schema: z.toJSONSchema(schema),
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  const contentText = extractResponseText(payload);
  if (!contentText) {
    throw new Error(`OpenAI response did not contain extractable text. Payload keys: ${Object.keys(payload ?? {}).join(', ')}`);
  }

  return schema.parse(JSON.parse(contentText));
}
