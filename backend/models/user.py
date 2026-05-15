"""User model and authentication logic for PyGliderCG backend"""

import bcrypt
import jwt
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class User:
	"""User data model (backend-compatible, no Streamlit dependencies)"""
	username: str
	email: str
	password: str
	role: str


class PasswordHasher:
	"""Handles password hashing and verification using bcrypt"""

	@staticmethod
	def hash_password(password: str) -> str:
		"""Hash a password using bcrypt
		
		Args:
			password: Plain text password to hash
			
		Returns:
			Hashed password string
		"""
		salt = bcrypt.gensalt()
		hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
		return hashed.decode('utf-8')

	@staticmethod
	def verify_password(plain_password: str, hashed_password: str) -> bool:
		"""Verify a plain text password against a hashed password
		
		Args:
			plain_password: Plain text password to verify
			hashed_password: Hashed password to check against
			
		Returns:
			True if password matches, False otherwise
		"""
		try:
			return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
		except (ValueError, AttributeError) as e:
			logger.error(f'Error verifying password: {e}')
			return False

	@staticmethod
	def is_already_hashed(password_str: str) -> bool:
		"""Check if a password is already bcrypt hashed
		
		Args:
			password_str: Password string to check
			
		Returns:
			True if already hashed, False otherwise
		"""
		return password_str.startswith('$2b$') or password_str.startswith('$2a$') or password_str.startswith('$2y$')


class TokenManager:
	"""Handles JWT token encoding and decoding"""

	def __init__(self, secret_key: Optional[str] = None, algorithm: Optional[str] = None):
		"""Initialize token manager
		
		Args:
			secret_key: Secret key for signing tokens (uses settings.COOKIE_KEY if not provided)
			algorithm: JWT algorithm (uses settings.JWT_ALGORITHM if not provided)
		"""
		self.secret_key = secret_key or settings.COOKIE_KEY
		self.algorithm = algorithm or settings.JWT_ALGORITHM

	def encode_token(self, username: str, expires_delta: Optional[timedelta] = None) -> str:
		"""Encode a JWT token for a user
		
		Args:
			username: Username to include in token
			expires_delta: Optional timedelta for token expiry (uses JWT_EXPIRY_HOURS if not provided)
			
		Returns:
			Encoded JWT token string
		"""
		now = datetime.now(timezone.utc)
		
		if expires_delta:
			expire = now + expires_delta
		else:
			expire = now + timedelta(hours=settings.JWT_EXPIRY_HOURS)
		
		payload = {
			'username': username,
			'iat': now,
			'exp': expire
		}
		
		token = jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
		logger.debug(f'Token encoded for user {username}')
		return token

	def decode_token(self, token: str) -> Optional[dict]:
		"""Decode and validate a JWT token
		
		Args:
			token: JWT token string to decode
			
		Returns:
			Decoded payload dict if valid, None if invalid or expired
		"""
		try:
			payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
			logger.debug(f'Token decoded successfully for user {payload.get("username")}')
			return payload
		except jwt.ExpiredSignatureError:
			logger.warning('Token has expired')
			return None
		except jwt.InvalidTokenError as e:
			logger.warning(f'Invalid token: {e}')
			return None

	def get_username_from_token(self, token: str) -> Optional[str]:
		"""Extract username from a token without full validation
		
		Args:
			token: JWT token string
			
		Returns:
			Username if token is valid, None otherwise
		"""
		payload = self.decode_token(token)
		if payload:
			return payload.get('username')
		return None


class RoleChecker:
	"""Handles role-based access control"""

	ADMIN_ROLE = 'administrator'
	EDITOR_ROLE = 'editor'
	VIEWER_ROLE = 'viewer'

	@staticmethod
	def is_admin(role: str) -> bool:
		"""Check if role is administrator
		
		Args:
			role: User role to check
			
		Returns:
			True if role is administrator
		"""
		return role == RoleChecker.ADMIN_ROLE

	@staticmethod
	def is_editor(role: str) -> bool:
		"""Check if role is editor or administrator
		
		Args:
			role: User role to check
			
		Returns:
			True if role is editor or admin
		"""
		return role in (RoleChecker.EDITOR_ROLE, RoleChecker.ADMIN_ROLE)

	@staticmethod
	def can_edit_user(user_role: str, target_username: str, current_username: str) -> bool:
		"""Check if user can edit another user
		
		Args:
			user_role: Role of the user attempting to edit
			target_username: Username of user being edited
			current_username: Username of current user
			
		Returns:
			True if user can edit target user
		"""
		if RoleChecker.is_admin(user_role):
			return True
		if target_username == current_username:
			return True
		return False
