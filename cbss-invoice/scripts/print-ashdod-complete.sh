#!/usr/bin/env bash
# Print the full Jamie Palmer Ashdod HTML packet to a separate PDF.
# Does not overwrite the compact 5-page ReportLab file.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-/opt/cursor/artifacts/jamie-palmer-packet}"
HTML="$OUT_DIR/CBSS-Jamie-Palmer-Ashdod-Packet.html"
PDF="$OUT_DIR/CBSS-Jamie-Palmer-Ashdod-Complete-Packet.pdf"
UDD="${TMPDIR:-/tmp}/chrome-ashdod-complete-$$"

mkdir -p "$OUT_DIR"
node --experimental-strip-types "$ROOT/scripts/render-palmer-packet.mjs" "$OUT_DIR"

mkdir -p "$UDD"
cleanup() { rm -rf "$UDD"; }
trap cleanup EXIT

timeout 25 google-chrome \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --no-pdf-header-footer \
  --user-data-dir="$UDD" \
  --print-to-pdf="$PDF" \
  "file://$HTML"

echo "$PDF"
