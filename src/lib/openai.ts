import { z } from 'zod';

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';

const getOpenAiApiKey = () => import.meta.env.VITE_OPENAI_API_KEY?.trim() || '';
const getOpenAiModel = () => import.meta.env.VITE_OPENAI_MODEL?.trim() || 'gpt-4.1-mini';

export const isOpenAiForcedOff = () => import.meta.env.VITE_FORCE_DETERMINISTIC_AI === 'true';
export const isOpenAiConfigured = () => Boolean(getOpenAiApiKey()) && !isOpenAiForcedOff();
export const getOpenAiRuntimeConfig = () => ({
  configured: isOpenAiConfigured(),
  forcedOff: isOpenAiForcedOff(),
  model: getOpenAiModel(),
});

export class OpenAiNotConfiguredError extends Error {
  constructor() {
    super('OpenAI API key is not configured. Set VITE_OPENAI_API_KEY to enable model-backed intelligence.');
  }
}

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
  const contentText = payload.output_text;
  if (!contentText) {
    throw new Error('OpenAI response did not contain output_text.');
  }

  return schema.parse(JSON.parse(contentText));
}
