#!/bin/bash

# PyGliderCG Backend Startup Script
# Starts the FastAPI backend with proper initialization

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
LOG_DIR="${PROJECT_ROOT}/logs"
CONTAINER_NAME="pyglider-backend"
IMAGE_NAME="pyglider-backend:latest"

# Create log directory
mkdir -p "$LOG_DIR"

echo "📦 PyGliderCG Backend Startup"
echo "=============================="
echo "Project Root: $PROJECT_ROOT"
echo "Log Directory: $LOG_DIR"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

# Load environment variables
if [ -f "$PROJECT_ROOT/.env" ]; then
    echo "✅ Loading environment from .env"
    export $(cat "$PROJECT_ROOT/.env" | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env file not found. Using defaults."
    export DEBUG=false
    export DB_NAME=./data/gliders.db
    export COOKIE_KEY="your-secret-key-change-in-production"
fi

# Create data directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/data"

# Build image if it doesn't exist
if ! docker image inspect "$IMAGE_NAME" > /dev/null 2>&1; then
    echo "🔨 Building Docker image: $IMAGE_NAME"
    docker build -t "$IMAGE_NAME" -f "$PROJECT_ROOT/backend/Dockerfile" "$PROJECT_ROOT"
    echo "✅ Image built successfully"
else
    echo "✅ Image already exists: $IMAGE_NAME"
fi

# Stop existing container if running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "⏹️  Stopping existing container..."
    docker stop "$CONTAINER_NAME"
    sleep 2
fi

# Remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "🗑️  Removing existing container..."
    docker rm "$CONTAINER_NAME"
fi

# Start backend container
echo "🚀 Starting backend container..."
docker run -d \
    --name "$CONTAINER_NAME" \
    -p 8000:8000 \
    -e DEBUG="${DEBUG}" \
    -e DB_NAME="${DB_NAME}" \
    -e DB_PATH="${DB_PATH:-.}/data" \
    -e HOST=0.0.0.0 \
    -e PORT=8000 \
    -e COOKIE_KEY="${COOKIE_KEY}" \
    -e LOG_LEVEL="${LOG_LEVEL:-INFO}" \
    -e PYTHONUNBUFFERED=1 \
    -v "$PROJECT_ROOT/data:/app/data" \
    --health-cmd='curl -f http://localhost:8000/health || exit 1' \
    --health-interval=30s \
    --health-timeout=10s \
    --health-start-period=10s \
    --health-retries=3 \
    "$IMAGE_NAME"

echo "✅ Backend container started"
echo ""

# Wait for backend to be healthy
echo "⏳ Waiting for backend to be healthy..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec "$CONTAINER_NAME" curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
        break
    fi
    attempt=$((attempt + 1))
    if [ $attempt -lt $max_attempts ]; then
        echo "  Attempt $attempt/$max_attempts..."
        sleep 1
    fi
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to become healthy"
    docker logs "$CONTAINER_NAME"
    exit 1
fi

echo ""
echo "✅ Backend startup complete!"
echo ""
echo "📊 Backend Information:"
echo "  - URL: http://localhost:8000"
echo "  - API Docs: http://localhost:8000/docs"
echo "  - Health: http://localhost:8000/health"
echo ""
echo "📝 View logs with: docker logs -f $CONTAINER_NAME"
echo "🛑 Stop with: docker stop $CONTAINER_NAME"
