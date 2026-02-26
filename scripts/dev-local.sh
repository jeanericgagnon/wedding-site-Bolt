#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${1:-4173}"
HOST="${2:-0.0.0.0}"

echo "[dev-local] starting vite on http://$HOST:$PORT"
exec npm run dev -- --host "$HOST" --port "$PORT"
