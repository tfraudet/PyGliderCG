"""
Production middleware configuration for FastAPI backend.
Adds security headers, rate limiting, and request/response logging.
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def add_production_middleware(app: FastAPI, trusted_hosts: Optional[list[str]] = None) -> None:
	"""
	Add production-ready middleware to FastAPI application.

	Args:
		app: FastAPI application instance
		trusted_hosts: List of trusted hosts for reverse proxy
	"""

	# Trusted Host Middleware
	if trusted_hosts is None:
		trusted_hosts = [
			"localhost",
			"127.0.0.1",
			"cg.acph.synology.me",
		]

	app.add_middleware(
		TrustedHostMiddleware,
		allowed_hosts=trusted_hosts,
	)

	# GZIP Compression
	app.add_middleware(GZipMiddleware, minimum_size=1000)

	# Security Headers Middleware
	@app.middleware("http")
	async def add_security_headers(request: Request, call_next) -> Response:
		"""Add security headers to all responses."""
		response = await call_next(request)

		# Security Headers
		response.headers["X-Content-Type-Options"] = "nosniff"
		response.headers["X-Frame-Options"] = "DENY"
		response.headers["X-XSS-Protection"] = "1; mode=block"
		response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
		response.headers["Content-Security-Policy"] = "default-src 'self'"
		response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"

		# Remove server identification
		response.headers["Server"] = "PyGliderCG"

		return response

	# Request/Response Logging Middleware
	@app.middleware("http")
	async def log_requests(request: Request, call_next) -> Response:
		"""Log request and response information."""
		start_time = time.time()

		# Log request
		logger.info(
			f"Incoming {request.method} {request.url.path} "
			f"from {request.client.host if request.client else 'unknown'}"
		)

		try:
			response = await call_next(request)
		except Exception as e:
			logger.error(f"Error processing request {request.method} {request.url.path}: {str(e)}")
			raise

		# Calculate processing time
		process_time = time.time() - start_time

		# Log response
		logger.info(
			f"Response {response.status_code} for {request.method} {request.url.path} "
			f"(took {process_time:.3f}s)"
		)

		# Add processing time header
		response.headers["X-Process-Time"] = str(process_time)

		return response


def add_rate_limiting_middleware(app: FastAPI) -> None:
	"""
	Add basic rate limiting middleware.
	For production, consider using fastapi-limiter or redis-based solution.
	"""
	from collections import defaultdict
	from datetime import datetime, timedelta

	request_counts = defaultdict(list)
	max_requests_per_minute = 100

	@app.middleware("http")
	async def rate_limit_middleware(request: Request, call_next) -> Response:
		"""
		Basic rate limiting middleware.
		Tracks requests per IP address per minute.
		"""
		client_ip = request.client.host if request.client else "unknown"
		current_time = datetime.now()

		# Clean old requests (older than 1 minute)
		request_counts[client_ip] = [
			req_time for req_time in request_counts[client_ip]
			if current_time - req_time < timedelta(minutes=1)
		]

		# Check rate limit
		if len(request_counts[client_ip]) >= max_requests_per_minute:
			logger.warning(f"Rate limit exceeded for IP: {client_ip}")
			return Response(
				content={"error": "Too many requests"},
				status_code=429,
				media_type="application/json",
			)

		# Record this request
		request_counts[client_ip].append(current_time)

		return await call_next(request)
