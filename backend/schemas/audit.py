"""Pydantic schemas for audit log API requests and responses"""

from pydantic import BaseModel, Field
from typing import List
from datetime import datetime


class AuditLogRequest(BaseModel):
	"""Request body for creating an audit log entry"""
	user_id: str = Field(..., min_length=1, description='User ID who performed the action')
	event: str = Field(..., min_length=1, description='Audit event text')

	class Config:
		json_schema_extra = {
			'example': {
				'user_id': 'admin',
				'event': 'Calcul centrage planeur pour F-CCCP : 450 kg, 320 mm'
			}
		}


class AuditLogResponse(BaseModel):
	"""Response body for audit log data"""
	timestamp: datetime = Field(..., description='When the action was performed (ISO 8601 format)')
	user_id: str = Field(..., description='User ID who performed the action')
	event: str = Field(..., description='Audit event details')

	class Config:
		json_schema_extra = {
			'example': {
				'timestamp': '2024-01-15T10:30:45.123456Z',
				'user_id': 'admin',
				'event': 'UPDATE glider/N-12345 {"field":"registration","old_value":"N-12344","new_value":"N-12345"}'
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
						'timestamp': '2024-01-15T10:30:45.123456Z',
						'user_id': 'admin',
						'event': 'UPDATE glider/N-12345'
					}
				]
			}
		}
