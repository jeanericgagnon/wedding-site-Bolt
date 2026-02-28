#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

printf "\n== Hard Pass: Tests ==\n"
npm run -s test

printf "\n== Hard Pass: Production Build ==\n"
npm run -s build

printf "\n== Hard Pass: Web Smoke ==\n"
npm run -s smoke:web

printf "\n== Hard Pass complete ✅ ==\n"
