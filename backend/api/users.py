"""FastAPI routes for User CRUD operations"""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from backend.db.user_queries import UserQueries
from backend.middleware.auth import require_admin_role
from backend.models.user import User
from backend.schemas.user import UserRequest, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/users', tags=['users'])


def _to_user_response(user: User) -> UserResponse:
	return UserResponse(
		username=user.username,
		email=user.email,
		password=user.password,
		role=user.role,
	)


@router.get('', response_model=List[UserResponse])
async def list_users(admin_user = Depends(require_admin_role)):
	try:
		logger.info(f'Admin user {admin_user.username} listing users')
		user_queries = UserQueries()
		users = user_queries.list_users()
		return [_to_user_response(user) for user in users]
	except Exception as e:
		logger.error(f'Error listing users: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to list users',
		)


@router.post('', response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
	request: UserRequest,
	admin_user = Depends(require_admin_role),
):
	try:
		logger.info(f'Admin user {admin_user.username} creating user {request.username}')
		user_queries = UserQueries()

		if user_queries.user_exists(request.username):
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f'User {request.username} already exists',
			)

		if not request.password:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail='Password is required',
			)

		user = User(
			username=request.username,
			email=request.email,
			password=request.password,
			role=request.role,
		)
		created = user_queries.create_user(user)
		if not created:
			raise ValueError('Failed to create user')

		created_user = user_queries.get_user_by_username(request.username)
		if not created_user:
			raise ValueError('Failed to fetch created user')

		return _to_user_response(created_user)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error creating user {request.username}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to create user',
		)


@router.put('/{username}', response_model=UserResponse)
async def update_user(
	username: str,
	request: UserRequest,
	admin_user = Depends(require_admin_role),
):
	try:
		logger.info(f'Admin user {admin_user.username} updating user {username}')
		user_queries = UserQueries()

		existing = user_queries.get_user_by_username(username)
		if not existing:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f'User {username} not found',
			)

		if request.username != username:
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail='Username cannot be changed',
			)

		updates = {
			'email': request.email,
			'role': request.role,
		}
		if request.password:
			updates['password'] = request.password

		updated = user_queries.update_user(username, updates)
		if not updated:
			raise ValueError('Failed to update user')

		updated_user = user_queries.get_user_by_username(username)
		if not updated_user:
			raise ValueError('Failed to fetch updated user')

		return _to_user_response(updated_user)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error updating user {username}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to update user',
		)


@router.delete('/{username}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
	username: str,
	admin_user = Depends(require_admin_role),
):
	try:
		logger.info(f'Admin user {admin_user.username} deleting user {username}')
		user_queries = UserQueries()

		existing = user_queries.get_user_by_username(username)
		if not existing:
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f'User {username} not found',
			)

		deleted = user_queries.delete_user(username)
		if not deleted:
			raise ValueError('Failed to delete user')

	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error deleting user {username}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to delete user',
		)
