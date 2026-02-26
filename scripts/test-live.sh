#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v act >/dev/null 2>&1; then
  echo "act is not installed. Run: brew install act" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker CLI not found. Run: brew install docker colima" >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "docker runtime not running. Starting colima..."
  colima start >/dev/null
fi

exec act -j build \
  --container-architecture linux/amd64 \
  -P ubuntu-latest=catthehacker/ubuntu:act-latest \
  --container-daemon-socket -
