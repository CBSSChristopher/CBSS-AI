#!/usr/bin/env bash
# Idempotent dependency setup for CBSS-AI.
set -euo pipefail

cd "$(dirname "$0")/.."

# The default Cloud Agent image ships Python but not the venv/pip data files.
# Install them only when creating a virtualenv would otherwise fail.
if ! python3 -m venv /tmp/.cbss-venv-probe >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3-venv python3-pip
fi
rm -rf /tmp/.cbss-venv-probe

python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo "CBSS-AI dependencies installed."
