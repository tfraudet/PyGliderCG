"""Database operations for users in DuckDB"""

import logging
from typing import Optional, List, Set
from pathlib import Path

import duckdb

from backend.config import get_settings
from backend.models.user import User, PasswordHasher

logger = logging.getLogger(__name__)
settings = get_settings()


class UserQueries:
	"""Database operations for user management"""

	def __init__(self, db_path: Optional[str] = None):
		"""Initialize user queries with database connection
		
		Args:
			db_path: Path to DuckDB database (uses settings.DB_NAME if not provided)
		"""
		self.db_path = db_path or settings.DB_NAME
		if settings.DB_PATH:
			self.db_path = str(Path(settings.DB_PATH) / self.db_path)
		self._ensure_users_table()

	def _get_connection(self):
		"""Get a DuckDB connection"""
		return duckdb.connect(self.db_path)

	def _ensure_users_table(self):
		"""Ensure the USERS table exists in the database"""
		conn = self._get_connection()
		try:
			conn.execute('''
				CREATE TABLE IF NOT EXISTS USERS (
					username VARCHAR PRIMARY KEY,
					email VARCHAR NOT NULL,
					password VARCHAR NOT NULL,
					role VARCHAR DEFAULT 'viewer',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			''')

			columns = self._get_users_columns(conn)
			if 'created_at' not in columns:
				conn.execute('ALTER TABLE USERS ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
			if 'updated_at' not in columns:
				conn.execute('ALTER TABLE USERS ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP')

			conn.commit()
			logger.debug('USERS table ensured in database')
		finally:
			conn.close()

	def _get_users_columns(self, conn) -> Set[str]:
		"""Get USERS table column names"""
		results = conn.execute("PRAGMA table_info('USERS')").fetchall()
		return {row[1] for row in results}

	def get_user_by_username(self, username: str) -> Optional[User]:
		"""Get a user by username
		
		Args:
			username: Username to look up
			
		Returns:
			User object if found, None otherwise
		"""
		conn = self._get_connection()
		try:
			result = conn.execute(
				'SELECT username, email, password, role FROM USERS WHERE username = ?',
				[username]
			).fetchall()
			
			if result:
				username, email, password, role = result[0]
				logger.debug(f'User {username} found in database')
				return User(
					username=username,
					email=email,
					password=password,
					role=role
				)
			logger.debug(f'User {username} not found in database')
			return None
		except Exception as e:
			logger.error(f'Error fetching user {username}: {e}')
			return None
		finally:
			conn.close()

	def get_user_by_id(self, user_id: str) -> Optional[User]:
		"""Get a user by ID (username is used as ID in this implementation)
		
		Args:
			user_id: User ID (username) to look up
			
		Returns:
			User object if found, None otherwise
		"""
		return self.get_user_by_username(user_id)

	def authenticate_user(self, username: str, password: str) -> Optional[User]:
		"""Authenticate a user by username and password
		
		Args:
			username: Username to authenticate
			password: Plain text password to verify
			
		Returns:
			User object if authentication successful, None otherwise
		"""
		user = self.get_user_by_username(username)
		if user and PasswordHasher.verify_password(password, user.password):
			logger.info(f'User {username} authenticated successfully')
			return user
		
		logger.warning(f'Failed authentication attempt for user {username}')
		return None

	def create_user(self, user: User) -> bool:
		"""Create a new user in the database
		
		Args:
			user: User object to create
			
		Returns:
			True if user was created, False otherwise
		"""
		conn = self._get_connection()
		try:
			hashed_password = PasswordHasher.hash_password(user.password)
			
			conn.execute(
				'INSERT INTO USERS (username, email, password, role) VALUES (?, ?, ?, ?)',
				[user.username, user.email, hashed_password, user.role]
			)
			conn.commit()
			logger.info(f'User {user.username} created in database')
			return True
		except Exception as e:
			logger.error(f'Error creating user {user.username}: {e}')
			return False
		finally:
			conn.close()

	def update_user(self, username: str, updates: dict) -> bool:
		"""Update an existing user in the database
		
		Args:
			username: Username of user to update
			updates: Dictionary of fields to update (e.g., {'email': 'new@email.com'})
			
		Returns:
			True if user was updated, False otherwise
		"""
		conn = self._get_connection()
		try:
			set_clauses = []
			params = []
			columns = self._get_users_columns(conn)
			
			for key, value in updates.items():
				if key == 'password':
					hashed_password = PasswordHasher.hash_password(value) if not PasswordHasher.is_already_hashed(value) else value
					set_clauses.append(f'{key} = ?')
					params.append(hashed_password)
				elif key in ('email', 'role'):
					set_clauses.append(f'{key} = ?')
					params.append(value)
			
			if not set_clauses:
				logger.warning(f'No valid fields to update for user {username}')
				return False
			
			if 'updated_at' in columns:
				set_clauses.append('updated_at = CURRENT_TIMESTAMP')
			params.append(username)
			
			sql = f"UPDATE USERS SET {', '.join(set_clauses)} WHERE username = ?"
			conn.execute(sql, params)
			conn.commit()
			logger.info(f'User {username} updated in database')
			return True
		except Exception as e:
			logger.error(f'Error updating user {username}: {e}')
			return False
		finally:
			conn.close()

	def delete_user(self, username: str) -> bool:
		"""Delete a user from the database
		
		Args:
			username: Username of user to delete
			
		Returns:
			True if user was deleted, False otherwise
		"""
		conn = self._get_connection()
		try:
			conn.execute('DELETE FROM USERS WHERE username = ?', [username])
			conn.commit()
			logger.info(f'User {username} deleted from database')
			return True
		except Exception as e:
			logger.error(f'Error deleting user {username}: {e}')
			return False
		finally:
			conn.close()

	def list_users(self) -> List[User]:
		"""Get all users from the database
		
		Args:
			
		Returns:
			List of User objects
		"""
		conn = self._get_connection()
		try:
			results = conn.execute(
				'SELECT username, email, password, role FROM USERS ORDER BY username'
			).fetchall()
			
			users = [
				User(
					username=username,
					email=email,
					password=password,
					role=role
				)
				for username, email, password, role in results
			]
			logger.debug(f'Retrieved {len(users)} users from database')
			return users
		except Exception as e:
			logger.error(f'Error fetching all users: {e}')
			return []
		finally:
			conn.close()

	def user_exists(self, username: str) -> bool:
		"""Check if a user exists in the database
		
		Args:
			username: Username to check
			
		Returns:
			True if user exists, False otherwise
		"""
		user = self.get_user_by_username(username)
		return user is not None
