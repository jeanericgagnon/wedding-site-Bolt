#!/usr/bin/env bash
set -euo pipefail

# Guardrail script to reduce migration drift surprises.
# Usage:
#   ./scripts/supabase-guard.sh

if ! command -v supabase >/dev/null 2>&1; then
  echo "[guard] supabase CLI not found" >&2
  exit 1
fi

echo "[guard] project: $(pwd)"
echo "[guard] checking migration history sync..."

OUT=$(mktemp)
if ! supabase migration list >"$OUT" 2>&1; then
  cat "$OUT"
  rm -f "$OUT"
  echo "[guard] failed to read migration state" >&2
  exit 1
fi

cat "$OUT"

if grep -qiE "does not match|mismatch|not present locally|repair" "$OUT"; then
  rm -f "$OUT"
  echo "[guard] migration drift detected. Stop and repair before deploy." >&2
  exit 2
fi

rm -f "$OUT"

echo "[guard] migration history looks consistent."

echo "[guard] checking remote migration apply state..."
if ! supabase db push; then
  echo "[guard] db push check failed." >&2
  exit 3
fi

echo "[guard] done: remote schema/migrations are in sync."

echo "[guard] note: 'supabase db pull' requires Docker daemon locally."
