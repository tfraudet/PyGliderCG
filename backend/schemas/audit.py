"""Pydantic schemas for audit log API requests and responses"""

from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime


class AuditLogRequest(BaseModel):
	"""Request body for creating an audit log entry"""
	user_id: str = Field(..., min_length=1, description='User ID who performed the action')
	action: str = Field(..., min_length=1, description='Action performed (CREATE, UPDATE, DELETE, READ, LOGIN, etc.)')
	resource_type: str = Field(..., min_length=1, description='Type of resource acted upon (glider, user, weighing, etc.)')
	resource_id: str = Field(..., min_length=1, description='ID of the resource being acted upon')
	details: Optional[dict[str, Any]] = Field(default=None, description='Additional context as JSON')

	class Config:
		json_schema_extra = {
			'example': {
				'user_id': 'admin',
				'action': 'UPDATE',
				'resource_type': 'glider',
				'resource_id': 'N-12345',
				'details': {'field': 'registration', 'old_value': 'N-12344', 'new_value': 'N-12345'}
			}
		}


class AuditLogResponse(BaseModel):
	"""Response body for audit log data"""
	id: int = Field(..., description='Audit log entry ID')
	timestamp: datetime = Field(..., description='When the action was performed (ISO 8601 format)')
	user_id: str = Field(..., description='User ID who performed the action')
	action: str = Field(..., description='Action performed')
	resource_type: str = Field(..., description='Type of resource acted upon')
	resource_id: str = Field(..., description='ID of the resource being acted upon')
	details: Optional[dict[str, Any]] = Field(default=None, description='Additional context')

	class Config:
		json_schema_extra = {
			'example': {
				'id': 1,
				'timestamp': '2024-01-15T10:30:45.123456Z',
				'user_id': 'admin',
				'action': 'UPDATE',
				'resource_type': 'glider',
				'resource_id': 'N-12345',
				'details': {'field': 'registration', 'old_value': 'N-12344', 'new_value': 'N-12345'}
			}
		}


class AuditLogListResponse(BaseModel):
	"""Response body for listing audit logs"""
	total: int = Field(..., description='Total number of audit log entries')
	skip: int = Field(..., description='Number of entries skipped')
	limit: int = Field(..., description='Limit used in query')
	items: List[AuditLogResponse] = Field(..., description='List of audit log entries')

	class Config:
		json_schema_extra = {
			'example': {
				'total': 150,
				'skip': 0,
				'limit': 10,
				'items': [
					{
						'id': 1,
						'timestamp': '2024-01-15T10:30:45.123456Z',
						'user_id': 'admin',
						'action': 'UPDATE',
						'resource_type': 'glider',
						'resource_id': 'N-12345',
						'details': None
					}
				]
			}
		}
