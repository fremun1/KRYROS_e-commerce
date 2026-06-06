#!/bin/bash
set -e

echo "Building API server..."
pnpm --filter @workspace/api-server run build

echo "Starting API server on port 3001..."
API_PORT=3001 node --enable-source-maps ./artifacts/api-server/dist/index.mjs &
API_PID=$!

echo "Starting frontend on port 5000..."
PORT=5000 BASE_PATH=/ pnpm --filter @workspace/kryros run dev &
FRONTEND_PID=$!

cleanup() {
  echo "Shutting down..."
  kill $API_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT INT TERM

wait $FRONTEND_PID
