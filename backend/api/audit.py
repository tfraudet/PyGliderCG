"""API routes for audit log management"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.db.audit_queries import AuditQueries
from backend.middleware.auth import get_current_user, require_admin_role
from backend.models.user import User
from backend.schemas.audit import (
	AuditLogRequest,
	AuditLogResponse,
	AuditLogListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/audit-logs', tags=['audit'])

audit_queries = AuditQueries()


@router.get('', response_model=AuditLogListResponse)
async def list_audit_logs(
	skip: int = Query(0, ge=0, description='Number of records to skip'),
	limit: int = Query(100, ge=1, le=1000, description='Maximum number of records to return'),
	user_id: Optional[str] = Query(None, description='Filter by user ID'),
	resource_type: Optional[str] = Query(None, description='Filter by resource type'),
	start_date: Optional[str] = Query(None, description='Filter entries after this date (ISO 8601 format)'),
	end_date: Optional[str] = Query(None, description='Filter entries before this date (ISO 8601 format)'),
	current_user: User = Depends(require_admin_role)
) -> AuditLogListResponse:
	"""List audit logs (admin only)
	
	Returns paginated audit log entries with optional filtering by user, resource type, or date range.
	Requires admin role.
	
	Query Parameters:
	- skip: Number of records to skip (default: 0)
	- limit: Maximum records to return (default: 100, max: 1000)
	- user_id: Optional - filter by user ID
	- resource_type: Optional - filter by resource type (glider, user, weighing, etc.)
	- start_date: Optional - ISO 8601 formatted date (filter entries after this date)
	- end_date: Optional - ISO 8601 formatted date (filter entries before this date)
	
	Returns:
	- AuditLogListResponse with total count and list of audit entries
	"""
	try:
		start_dt = None
		end_dt = None
		
		if start_date:
			try:
				start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
			except ValueError as e:
				logger.warning(f'Invalid start_date format: {start_date}')
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail=f'Invalid start_date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)'
				)
		
		if end_date:
			try:
				end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
			except ValueError as e:
				logger.warning(f'Invalid end_date format: {end_date}')
				raise HTTPException(
					status_code=status.HTTP_400_BAD_REQUEST,
					detail=f'Invalid end_date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)'
				)
		
		result = audit_queries.get_audit_logs(
			skip=skip,
			limit=limit,
			user_id=user_id,
			resource_type=resource_type,
			start_date=start_dt,
			end_date=end_dt
		)
		
		items = [
			AuditLogResponse(**entry).model_dump(include={'timestamp', 'user_id', 'event'})
			for entry in result['items']
		]
		
		return AuditLogListResponse(
			total=result['total'],
			skip=skip,
			limit=limit,
			items=items
		)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error listing audit logs: {e}')
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Error retrieving audit logs'
		)


@router.delete('', status_code=status.HTTP_200_OK)
async def delete_all_audit_logs(current_user: User = Depends(require_admin_role)) -> dict:
	"""Delete all audit logs (admin only)
	
	Deletes all entries from audit logs table.
	Requires admin role.
	
	Returns:
	- Dict with number of deleted entries
	"""
	try:
		deleted_count = audit_queries.delete_all_audit_logs()
		logger.info(f'Admin user {current_user.username} deleted all audit logs ({deleted_count})')
		return {
			'message': 'Audit logs deleted successfully',
			'deleted_count': deleted_count,
		}
	except Exception as e:
		logger.error(f'Error deleting audit logs: {e}')
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Error deleting audit logs'
		)


@router.get('/resource/{resource_type}/{resource_id}', response_model=list[AuditLogResponse])
async def get_resource_history(
	resource_type: str,
	resource_id: str,
	current_user: User = Depends(get_current_user)
) -> list[AuditLogResponse]:
	"""Get complete history of changes for a specific resource
	
	Returns all audit log entries for a specific resource, ordered by timestamp (newest first).
	Requires authenticated user.
	
	Path Parameters:
	- resource_type: Type of resource (glider, user, weighing, etc.)
	- resource_id: ID of the resource
	
	Returns:
	- List of AuditLogResponse entries for this resource
	"""
	try:
		if not resource_type or not resource_id:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail='resource_type and resource_id are required'
			)
		
		entries = audit_queries.get_audit_logs_by_resource(
			resource_type=resource_type,
			resource_id=resource_id
		)
		
		if not entries:
			logger.debug(f'No audit history found for {resource_type}/{resource_id}')
			return []
		
		return [
			AuditLogResponse(**entry).model_dump(include={'timestamp', 'user_id', 'event'})
			for entry in entries
		]
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error retrieving resource history: {e}')
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Error retrieving resource history'
		)


@router.get('/user/{user_id}', response_model=AuditLogListResponse)
async def get_user_actions(
	user_id: str,
	skip: int = Query(0, ge=0, description='Number of records to skip'),
	limit: int = Query(100, ge=1, le=1000, description='Maximum number of records to return'),
	current_user: User = Depends(get_current_user)
) -> AuditLogListResponse:
	"""Get all actions performed by a specific user
	
	Returns paginated audit log entries for a specific user.
	Users can view their own actions. Admins can view any user's actions.
	
	Path Parameters:
	- user_id: User ID to get actions for
	
	Query Parameters:
	- skip: Number of records to skip (default: 0)
	- limit: Maximum records to return (default: 100, max: 1000)
	
	Returns:
	- AuditLogListResponse with total count and list of audit entries
	"""
	try:
		from backend.models.user import RoleChecker
		
		if not user_id:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail='user_id is required'
			)
		
		can_view_user = (
			current_user.username == user_id or
			RoleChecker.is_admin(current_user.role)
		)
		
		if not can_view_user:
			logger.warning(f'User {current_user.username} attempted unauthorized access to {user_id} audit logs')
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail='You do not have permission to view this user\'s action history'
			)
		
		result = audit_queries.get_user_actions(
			user_id=user_id,
			skip=skip,
			limit=limit
		)
		
		items = [
			AuditLogResponse(**entry).model_dump(include={'timestamp', 'user_id', 'event'})
			for entry in result['items']
		]
		
		return AuditLogListResponse(
			total=result['total'],
			skip=skip,
			limit=limit,
			items=items
		)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error retrieving user actions: {e}')
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Error retrieving user actions'
		)
