#!/usr/bin/env bash
# Render build script — only installs dependencies.
# Migrations are handled in start.sh at server startup (not here)
# so they always have access to the runtime DATABASE_URL env var.
set -e

echo "==> Upgrading pip..."
pip install --upgrade pip --quiet

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Build complete ✓"
