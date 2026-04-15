#!/usr/bin/env bash
# Render build script — native Python runtime (no Docker)
set -e

echo "==> Upgrading pip..."
pip install --upgrade pip --quiet

echo "==> Installing Python dependencies..."
pip install -r requirements.txt

echo "==> Running database migrations..."
python -m alembic upgrade head

echo "==> Build complete ✓"
