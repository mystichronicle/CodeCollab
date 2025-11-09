from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import time

from app.core.config import settings
from app.core.mongodb import connect_to_mongo, close_mongo_connection
from app.core.init_db import init_mongodb_indexes
from app.api.v1 import health, users, sessions, auth, templates

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API Gateway for distributed code collaboration platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Track request processing time and log all requests."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(
        f"{request.method} {request.url.path} - "
        f"{response.status_code} - {process_time:.3f}s"
    )
    return response


@app.exception_handler(Exception)
async def handle_exceptions(request: Request, exc: Exception):
    """Centralized exception handling to prevent information leakage."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(sessions.router, prefix="/api/v1", tags=["sessions"])
app.include_router(templates.router, prefix="/api/v1", tags=["templates"])


@app.on_event("startup")
async def startup_event():
    """Run tasks on application startup."""
    logger.info("Connecting to MongoDB...")
    await connect_to_mongo()
    logger.info("Creating database indexes...")
    await init_mongodb_indexes()
    logger.info("Application startup complete!")



@app.on_event("shutdown")
async def on_shutdown():
    """Clean up resources on shutdown."""
    logger.info("Shutting down API Gateway")
    # Close MongoDB connection
    await close_mongo_connection()


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "message": "CodeCollab API Gateway",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs"
    }
