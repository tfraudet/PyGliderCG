#!/bin/sh

set -eu

BACKEND_HOST="${HOST:-0.0.0.0}"
BACKEND_PORT="${PORT:-8000}"
LOG_LEVEL="${LOG_LEVEL:-INFO}"

STREAMLIT_HOST="${STREAMLIT_SERVER_ADDRESS:-0.0.0.0}"
STREAMLIT_PORT="${STREAMLIT_SERVER_PORT:-8501}"
STREAMLIT_HEADLESS="${STREAMLIT_SERVER_HEADLESS:-true}"
STREAMLIT_TOOLBAR_MODE="${STREAMLIT_CLIENT_TOOLBAR_MODE:-minimal}"

cleanup() {
	if [ -n "${STREAMLIT_PID:-}" ] && kill -0 "${STREAMLIT_PID}" 2>/dev/null; then
		kill "${STREAMLIT_PID}" 2>/dev/null || true
	fi
	if [ -n "${BACKEND_PID:-}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
		kill "${BACKEND_PID}" 2>/dev/null || true
	fi
}

trap cleanup INT TERM EXIT

uvicorn backend.main:app \
	--host "${BACKEND_HOST}" \
	--port "${BACKEND_PORT}" \
	--log-level "$(echo "${LOG_LEVEL}" | tr '[:upper:]' '[:lower:]')" &
BACKEND_PID=$!

streamlit run frontend/streamlit_app.py \
	--server.headless "${STREAMLIT_HEADLESS}" \
	--server.address "${STREAMLIT_HOST}" \
	--server.port "${STREAMLIT_PORT}" \
	--client.toolbarMode "${STREAMLIT_TOOLBAR_MODE}" &
STREAMLIT_PID=$!

while true; do
	if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
		wait "${BACKEND_PID}" || true
		exit 1
	fi
	if ! kill -0 "${STREAMLIT_PID}" 2>/dev/null; then
		wait "${STREAMLIT_PID}" || true
		exit 1
	fi
	sleep 1
done
