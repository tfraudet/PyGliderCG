#!/bin/sh

set -eu

BACKEND_HOST="${HOST:-0.0.0.0}"
BACKEND_PORT="${PORT:-8000}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

exec uvicorn backend.main:app \
	--host "${BACKEND_HOST}" \
	--port "${BACKEND_PORT}" \
	--log-level "$(echo "${LOG_LEVEL}" | tr '[:upper:]' '[:lower:]')"
