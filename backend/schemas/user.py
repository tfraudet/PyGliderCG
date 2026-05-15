"""Pydantic schemas for user API requests and responses"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class LoginRequest(BaseModel):
	"""Request body for user login"""
	username: str = Field(..., min_length=3, max_length=50, description='Username')
	password: str = Field(..., min_length=6, description='Password')


class UserRequest(BaseModel):
	"""Request body for creating or updating a user"""
	username: str = Field(..., min_length=3, max_length=50, description='Username')
	email: EmailStr = Field(..., description='User email address')
	password: Optional[str] = Field(None, min_length=6, description='Password (required for create, optional for update)')
	role: str = Field(default='viewer', description='User role')

	class Config:
		json_schema_extra = {
			'example': {
				'username': 'john_doe',
				'email': 'john@example.com',
				'password': 'secure_password',
				'role': 'viewer'
			}
		}


class UserResponse(BaseModel):
	"""Response body for user data"""
	username: str = Field(..., description='Username')
	email: str = Field(..., description='User email address')
	password: Optional[str] = Field(None, description='User password hash')
	role: str = Field(..., description='User role')

	class Config:
		json_schema_extra = {
			'example': {
				'username': 'john_doe',
				'email': 'john@example.com',
				'password': '$2b$12$...',
				'role': 'viewer'
			}
		}


class TokenResponse(BaseModel):
	"""Response body for login/token endpoint"""
	access_token: str = Field(..., description='JWT access token')
	token_type: str = Field(default='bearer', description='Token type')
	expires_in: int = Field(..., description='Token expiration time in seconds')

	class Config:
		json_schema_extra = {
			'example': {
				'access_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
				'token_type': 'bearer',
				'expires_in': 86400
			}
		}


class TokenPayload(BaseModel):
	"""Decoded JWT token payload"""
	username: str = Field(..., description='Username')
	exp: int = Field(..., description='Token expiration timestamp')
	iat: int = Field(..., description='Token issued at timestamp')


class TokenRequest(BaseModel):
	"""Request body for token refresh"""
	refresh_token: str = Field(..., description='Refresh token to exchange for new access token')

	class Config:
		json_schema_extra = {
			'example': {
				'refresh_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
			}
		}
