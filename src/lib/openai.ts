import { z } from 'zod';

const getViteEnvValue = (key: string) => {
  const value = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : undefined;
  return (value || '').trim();
};

export const isOpenAiForcedOff = () => getViteEnvValue('VITE_FORCE_DETERMINISTIC_AI') === 'true';
export const isOpenAiConfigured = () => false;
export const getOpenAiRuntimeConfig = () => ({
  configured: false,
  forcedOff: isOpenAiForcedOff(),
  model: 'server-side-only',
});

export class OpenAiNotConfiguredError extends Error {
  constructor() {
    super('Model-backed intelligence runs server-side only.');
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
  model = 'server-side-only',
}: StructuredPromptOptions<TSchema>): Promise<z.infer<TSchema>> {
  void system;
  void user;
  void schemaName;
  void schema;
  void model;
  throw new OpenAiNotConfiguredError();
}
