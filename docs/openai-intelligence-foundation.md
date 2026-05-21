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
Set:
- `OPENAI_API_KEY`

Optional later:
- `OPENAI_MODEL`

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
Wire this provider into draft generation first, behind a graceful fallback to the current deterministic generator.
