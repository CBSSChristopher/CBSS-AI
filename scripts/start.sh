#!/usr/bin/env bash
# Launch the CBSS-AI development server (foreground).
set -euo pipefail

cd "$(dirname "$0")/.."

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

exec .venv/bin/uvicorn app.main:app --host "$HOST" --port "$PORT" --reload
