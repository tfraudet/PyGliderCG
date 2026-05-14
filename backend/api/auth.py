"""FastAPI authentication endpoints for PyGliderCG"""

import logging
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status

from backend.config import get_settings
from backend.db.user_queries import UserQueries
from backend.middleware.auth import get_current_user, verify_token
from backend.models.user import TokenManager, PasswordHasher
from backend.schemas.user import (
	LoginRequest,
	TokenRequest,
	TokenResponse,
	UserResponse,
)

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/login', response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
	"""
	User login endpoint.
	
	Authenticates a user with username and password, returns JWT access token.
	
	Args:
		request: LoginRequest with username and password
		
	Returns:
		TokenResponse with access_token, token_type, and expires_in
		
	Raises:
		HTTPException: 401 if credentials are invalid
		
	Security:
		- Passwords are never logged
		- Generic error message for failed login (doesn't reveal if user exists)
		- Future: Rate limiting should be implemented
	"""
	user_queries = UserQueries()
	user = user_queries.authenticate_user(request.username, request.password)
	
	if not user:
		logger.warning(f'Failed login attempt for username: {request.username}')
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='Invalid username or password',
		)
	
	token_manager = TokenManager()
	access_token = token_manager.encode_token(
		username=user.username,
		expires_delta=timedelta(hours=settings.JWT_EXPIRY_HOURS)
	)
	
	logger.info(f'User {user.username} logged in successfully')
	
	return TokenResponse(
		access_token=access_token,
		token_type='bearer',
		expires_in=settings.JWT_EXPIRY_HOURS * 3600,
	)


@router.post('/logout', status_code=status.HTTP_200_OK)
async def logout(current_user = Depends(get_current_user)) -> dict:
	"""
	User logout endpoint.
	
	Performs logout operations (mainly for client-side cleanup).
	In production, you may want to maintain a token blacklist for more robust logout.
	
	Args:
		current_user: Current authenticated user (dependency injection)
		
	Returns:
		Message confirming logout
		
	Security:
		- Requires valid JWT token
		- In a production system with stateless JWT, consider:
		  * Token blacklist/revocation list in Redis
		  * Short token expiry times
		  * Client-side token deletion
	"""
	logger.info(f'User {current_user.username} logged out')
	return {'message': 'Logged out successfully'}


@router.post('/refresh', response_model=TokenResponse)
async def refresh_token(
	request: TokenRequest,
	token_payload = Depends(verify_token),
) -> TokenResponse:
	"""
	Refresh access token endpoint.
	
	Issues a new access token using the refresh token or current valid token.
	
	Args:
		request: TokenRequest with refresh_token
		token_payload: Verified token payload (dependency injection)
		
	Returns:
		TokenResponse with new access_token
		
	Raises:
		HTTPException: 401 if token is invalid or expired
		
	Security:
		- Validates current token through dependency injection
		- Only allows refresh if token contains valid username
		- Returns 401 with generic message on token validation failure
	"""
	username = token_payload.username
	
	user_queries = UserQueries()
	user = user_queries.get_user_by_username(username)
	
	if not user:
		logger.warning(f'Attempted token refresh for non-existent user: {username}')
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='User not found',
		)
	
	token_manager = TokenManager()
	new_access_token = token_manager.encode_token(
		username=user.username,
		expires_delta=timedelta(hours=settings.JWT_EXPIRY_HOURS)
	)
	
	logger.info(f'Token refreshed for user {user.username}')
	
	return TokenResponse(
		access_token=new_access_token,
		token_type='bearer',
		expires_in=settings.JWT_EXPIRY_HOURS * 3600,
	)


@router.get('/me', response_model=UserResponse)
async def get_current_user_info(current_user = Depends(get_current_user)) -> UserResponse:
	"""
	Get current authenticated user information.
	
	Returns user data (excluding password) for the authenticated user.
	
	Args:
		current_user: Current authenticated user (dependency injection)
		
	Returns:
		UserResponse with user data (id, username, email, role)
		
	Raises:
		HTTPException: 401 if not authenticated
		
	Security:
		- Requires valid JWT token
		- Never returns password hash
		- Returns user database record without sensitive fields
	"""
	logger.debug(f'Retrieved user info for {current_user.username}')
	
	return UserResponse(
		id=current_user.username,
		username=current_user.username,
		email=current_user.email,
		role=current_user.role,
	)
