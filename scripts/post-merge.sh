#!/bin/bash
set -e

echo "Running post-merge setup..."

echo "Installing frontend workspace packages..."
cd Frontend/User-UI
pnpm install --frozen-lockfile
cd ../..

echo "Installing admin panel packages..."
cd Frontend/Admi-Panel
npm install --legacy-peer-deps
cd ../..

echo "Post-merge setup complete."
