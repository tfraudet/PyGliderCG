# Multi-stage build for FastAPI backend
# Stage 1: Builder
FROM python:3.12.13-alpine3.23 as builder

WORKDIR /tmp

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
	build-base \
	python3-dev

# Copy requirements and install to /install directory
COPY requirements-backend.txt .
RUN pip install --user --no-cache-dir -r requirements-backend.txt

# Stage 2: Runtime
FROM python:3.12.13-alpine3.23

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache curl

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Set environment variables
ENV PATH=/root/.local/bin:$PATH \
	PYTHONUNBUFFERED=1 \
	PYTHONDONTWRITEBYTECODE=1

# Copy application code
COPY . .

# Create data directory for database
RUN mkdir -p /app/data

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
	CMD curl -f http://localhost:8000/health || exit 1

# Default command runs uvicorn server
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
