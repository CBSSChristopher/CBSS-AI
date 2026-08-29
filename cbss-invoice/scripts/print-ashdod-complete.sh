#!/usr/bin/env bash
# Print the full Jamie Palmer Ashdod HTML packet to a separate PDF.
# Does not overwrite the compact 5-page ReportLab file.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${1:-/opt/cursor/artifacts/jamie-palmer-packet}"
HTML="$OUT_DIR/CBSS-Jamie-Palmer-Ashdod-Packet.html"
PDF="$OUT_DIR/CBSS-Jamie-Palmer-Ashdod-Complete-Packet.pdf"
PRINT_PDF="$OUT_DIR/CBSS-Jamie-Palmer-Ashdod-Complete-Packet-print.pdf"
UDD="${TMPDIR:-/tmp}/chrome-ashdod-complete-$$"

mkdir -p "$OUT_DIR"
node --experimental-strip-types "$ROOT/scripts/render-palmer-packet.mjs" "$OUT_DIR"
PY="${PDFVENV_PYTHON:-/tmp/pdfvenv/bin/python}"
if [ ! -x "$PY" ]; then PY="python3"; fi
"$PY" "$ROOT/scripts/write-ashdod-complete-pdf.py" "$PDF"

mkdir -p "$UDD"
cleanup() { rm -rf "$UDD"; }
trap cleanup EXIT

# Optional styled Chrome print. The Drive file is the ReportLab complete PDF above.
timeout 25 google-chrome \
  --headless \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --no-pdf-header-footer \
  --user-data-dir="$UDD" \
  --print-to-pdf="$PRINT_PDF" \
  "file://$HTML" || true

echo "$PDF"
