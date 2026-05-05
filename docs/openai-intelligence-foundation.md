# OpenAI intelligence foundation

## Purpose
Provide a narrow provider layer for model-backed intelligence while keeping local rails in charge of:
- state
- merge logic
- provenance / overwrite protection
- canonical builder/public truth paths
- regression harness

## Current foundation
- `src/lib/openai.ts`
  - `isOpenAiConfigured()`
  - `OpenAiNotConfiguredError`
  - `runOpenAiStructuredPrompt(...)`

## Configuration
Set model-provider keys only in server-side environments:
- Supabase Edge Function secret `OPENAI_API_KEY`
- Optional server-side model names such as `ONBOARDING_AI_MODEL`, `PHOTO_AI_MODEL`, or `OPENAI_MODEL`

Do not use browser-visible `VITE_` variables for provider API keys.

## Intended usage pattern
Use OpenAI only for:
- messy language understanding
- structured extraction
- higher-quality draft copy generation

Keep local deterministic logic for:
- ownership / provenance
- patching builder project state
- merge safety
- public render truth
- fallbacks when OpenAI is unavailable

## Next step
Keep model-backed production calls behind Edge Functions or server-only runtime code. Browser-facing helpers should fall back deterministically unless a server route is explicitly added.
