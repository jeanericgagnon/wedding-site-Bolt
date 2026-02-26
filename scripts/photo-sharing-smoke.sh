#!/usr/bin/env bash
set -euo pipefail

# Lightweight operational smoke check for photo-sharing stack.
# Usage:
#   scripts/photo-sharing-smoke.sh [project-ref]

PROJECT_REF="${1:-}"

if [[ -n "$PROJECT_REF" ]]; then
  supabase link --project-ref "$PROJECT_REF" >/dev/null
fi

echo "== Supabase migration status =="
supabase migration list | tail -n 6

echo

echo "== Functions status (photo-sharing) =="
supabase functions list | grep -E "photo-album-create|photo-upload|photo-album-manage" || true

echo

echo "== Local build/typecheck =="
npm run -s typecheck
npm run -s build >/dev/null

echo

echo "Smoke check completed ✅"
