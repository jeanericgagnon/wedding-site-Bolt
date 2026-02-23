#!/usr/bin/env bash
set -euo pipefail

PROD_BASE="https://dayof.love"
QA_BASE="https://jeanericgagnon.github.io/wedding-site-Bolt"
ROUTES=(
  "/"
  "/product"
  "/dashboard/overview"
  "/dashboard/guests"
  "/dashboard/registry"
  "/dashboard/seating"
  "/dashboard/builder"
)

check_url() {
  local base="$1"
  local route="$2"
  local url="${base}${route}"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  printf "%-60s %s\n" "$url" "$code"
}

echo "== Smoke: Production =="
for r in "${ROUTES[@]}"; do
  check_url "$PROD_BASE" "$r"
done

echo
echo "== Smoke: QA (GitHub Pages) =="
for r in "${ROUTES[@]}"; do
  check_url "$QA_BASE" "$r"
done

echo
echo "== Smoke: QA fallback assets =="
check_url "$QA_BASE" "/404.html"
check_url "$QA_BASE" "/?oc_redirect=%2Fdashboard%2Fbuilder"

echo
echo "Note: GitHub Pages SPA deep links may return 404 over raw HTTP while still working client-side via 404.html fallback."
