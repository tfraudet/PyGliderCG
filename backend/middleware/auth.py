"""Authentication middleware and dependencies for FastAPI"""

import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.config import get_settings
from backend.models.user import TokenManager, RoleChecker
from backend.db.user_queries import UserQueries
from backend.schemas.user import TokenPayload

logger = logging.getLogger(__name__)
settings = get_settings()

security = HTTPBearer()


async def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> TokenPayload:
	"""Verify JWT token from request headers
	
	Args:
		credentials: HTTP credentials from Authorization header
		
	Returns:
		TokenPayload with decoded token information
		
	Raises:
		HTTPException: If token is invalid or expired
	"""
	if not credentials:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='No credentials provided',
			headers={'WWW-Authenticate': 'Bearer'}
		)
	
	token = credentials.credentials
	token_manager = TokenManager()
	payload = token_manager.decode_token(token)
	
	if payload is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='Invalid or expired token',
			headers={'WWW-Authenticate': 'Bearer'}
		)
	
	try:
		token_payload = TokenPayload(**payload)
		return token_payload
	except Exception as e:
		logger.error(f'Error parsing token payload: {e}')
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='Invalid token structure',
			headers={'WWW-Authenticate': 'Bearer'}
		)


async def get_current_user(token_payload: TokenPayload = Depends(verify_token)):
	"""Get the current authenticated user from token
	
	Args:
		token_payload: Verified token payload
		
	Returns:
		Username of authenticated user
		
	Raises:
		HTTPException: If user not found in database
	"""
	username = token_payload.username
	user_queries = UserQueries()
	user = user_queries.get_user_by_username(username)
	
	if user is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail='User not found',
			headers={'WWW-Authenticate': 'Bearer'}
		)
	
	return user


async def require_admin_role(current_user = Depends(get_current_user)):
	"""Dependency to require admin role
	
	Args:
		current_user: Current authenticated user
		
	Returns:
		Current user if they have admin role
		
	Raises:
		HTTPException: If user does not have admin role
	"""
	if not RoleChecker.is_admin(current_user.role):
		logger.warning(f'Unauthorized access attempt by user {current_user.username}')
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail='Admin role required'
		)
	
	return current_user


async def require_editor_role(current_user = Depends(get_current_user)):
	"""Dependency to require editor or admin role
	
	Args:
		current_user: Current authenticated user
		
	Returns:
		Current user if they have editor or admin role
		
	Raises:
		HTTPException: If user does not have editor/admin role
	"""
	if not RoleChecker.is_editor(current_user.role):
		logger.warning(f'Unauthorized access attempt by user {current_user.username}')
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail='Editor role required'
		)
	
	return current_user


def check_can_edit_user(target_username: str, current_user) -> bool:
	"""Check if current user can edit target user
	
	Args:
		target_username: Username of user being edited
		current_user: Current authenticated user
		
	Returns:
		True if user can edit target user
		
	Raises:
		HTTPException: If user does not have permission
	"""
	if not RoleChecker.can_edit_user(current_user.role, target_username, current_user.username):
		logger.warning(f'User {current_user.username} attempted unauthorized edit of {target_username}')
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail='You do not have permission to edit this user'
		)
	
	return True
