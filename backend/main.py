"""FastAPI application entry point for PyGliderCG backend"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.api.auth import router as auth_router
from backend.api.database import router as database_router
from backend.api.gliders import router as gliders_router
from backend.api.audit import router as audit_router
from backend.api.users import router as users_router
from backend.init_db import initialize_database

# Configure logging using LOG_LEVEL env variable (default: INFO)
_settings = get_settings()
logging.basicConfig(
    level=getattr(logging, _settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown event handlers"""
    # Startup
    logger.info("🚀 Starting PyGliderCG backend")
    logger.info(f"Debug mode: {get_settings().APP_DEBUG_MODE}")

    initialize_database(get_settings().DB_NAME)
    logger.info(f"✅ Database {get_settings().DB_NAME} initialized")

    yield

    # Shutdown
    logger.info("🛑 Shutting down PyGliderCG backend")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.APP_DEBUG_MODE,
        lifespan=lifespan,
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    # Root endpoint
    @app.get("/", tags=["root"])
    async def root():
        """Root endpoint"""
        return {
            "message": f"Welcome to {settings.APP_NAME}",
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "redoc": "/redoc",
        }

    # Register routers
    app.include_router(auth_router)
    app.include_router(database_router)
    app.include_router(gliders_router)
    app.include_router(audit_router)
    app.include_router(users_router)

    logger.info("✅ FastAPI application created successfully")
    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    import argparse
    import uvicorn

    parser = argparse.ArgumentParser(description='PyGliderCG backend server')
    parser.add_argument('--reload', action='store_true', default=False, help='Enable auto-reload on code changes')
    args = parser.parse_args()

    settings = get_settings()
    uvicorn.run(
        "backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=args.reload,
        log_level=settings.LOG_LEVEL.lower(),
    )
