#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

npm run smoke:rsvp
npm run smoke:site
npm run smoke:web
npm run smoke:checkin
npm run smoke:csvmapper

npm run preview -- --host 127.0.0.1 --port 4173 >/tmp/dayof-preview.log 2>&1 &
PREVIEW_PID=$!
cleanup() {
  kill "$PREVIEW_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# wait for preview readiness
for _ in {1..30}; do
  if curl -sf http://127.0.0.1:4173/ >/dev/null; then
    break
  fi
  sleep 1
done

node scripts/fullsite_feature_smoke.mjs

echo "smoke:full complete"
