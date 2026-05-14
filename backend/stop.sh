#!/bin/bash

# PyGliderCG Backend Shutdown Script
# Safely shuts down the FastAPI backend

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
CONTAINER_NAME="pyglider-backend"

echo "🛑 PyGliderCG Backend Shutdown"
echo "==============================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Check if container exists and is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "ℹ️  Container is not running"
    else
        echo "ℹ️  Container does not exist"
    fi
    exit 0
fi

# Get container status
STATUS=$(docker inspect "$CONTAINER_NAME" --format='{{.State.Status}}')
echo "Container Status: $STATUS"
echo ""

# Graceful shutdown
echo "⏹️  Sending shutdown signal to backend..."
docker stop --time=30 "$CONTAINER_NAME"

echo "✅ Backend shutdown complete"
echo ""
echo "To remove the container: docker rm $CONTAINER_NAME"
echo "To remove with data: docker rm -v $CONTAINER_NAME"
