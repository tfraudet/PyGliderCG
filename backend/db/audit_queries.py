"""Database operations for audit logs in DuckDB"""

import logging
import json
from typing import Optional, List, Dict, Any
from pathlib import Path
from datetime import datetime, timezone

import duckdb

from backend.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class AuditQueries:
	"""Database operations for audit log management"""

	def __init__(self, db_path: Optional[str] = None):
		"""Initialize audit queries with database connection
		
		Args:
			db_path: Path to DuckDB database (uses settings.DB_NAME if not provided)
		"""
		self.db_path = db_path or settings.DB_NAME
		if settings.DB_PATH:
			self.db_path = str(Path(settings.DB_PATH) / self.db_path)

	def _get_connection(self):
		"""Get a DuckDB connection"""
		return duckdb.connect(self.db_path)

	def _table_exists(self, conn, table_name: str) -> bool:
		"""Check if a table exists in the current database"""
		result = conn.execute(
			'SELECT COUNT(*) FROM information_schema.tables WHERE upper(table_name) = upper(?)',
			[table_name]
		).fetchall()
		return bool(result and result[0][0] > 0)

	def _ensure_audit_table(self):
		"""Ensure the AUDITLOG table exists in the database"""
		conn = self._get_connection()
		try:
			conn.execute('''
				CREATE TABLE IF NOT EXISTS AUDITLOG (
					timestamp TIMESTAMP PRIMARY KEY,
					username VARCHAR,
					event VARCHAR
				)
			''')
			conn.commit()
			logger.debug('AUDITLOG table ensured in database')
		except Exception as e:
			logger.error(f'Error ensuring AUDITLOG table: {e}')
		finally:
			conn.close()

	def create_audit_entry(
		self,
		user_id: str,
		action: str,
		resource_type: str,
		resource_id: str,
		details: Optional[Dict[str, Any]] = None
	) -> Optional[int]:
		"""Insert an audit log entry
		
		Args:
			user_id: User ID who performed the action
			action: Action performed (CREATE, UPDATE, DELETE, READ, LOGIN, etc.)
			resource_type: Type of resource acted upon (glider, user, weighing, etc.)
			resource_id: ID of the resource being acted upon
			details: Additional context as JSON dict
			
		Returns:
			Audit entry ID if successful, None otherwise
		"""
		conn = self._get_connection()
		try:
			details_json = json.dumps(details, ensure_ascii=False) if details else ''
			event = f'{action} {resource_type}/{resource_id}'
			if details_json:
				event = f'{event} {details_json}'
			timestamp = datetime.now(timezone.utc).replace(tzinfo=None)
			conn.execute(
				'INSERT INTO AUDITLOG VALUES (?, ?, ?)',
				[timestamp, user_id, event]
			)
			
			conn.commit()
			logger.info(f'Audit entry created: {user_id} {event}')
			return int(timestamp.timestamp())
		except Exception as e:
			logger.error(f'Error creating audit entry: {e}')
			return None
		finally:
			conn.close()

	def get_audit_logs(
		self,
		skip: int = 0,
		limit: int = 100,
		user_id: Optional[str] = None,
		resource_type: Optional[str] = None,
		start_date: Optional[datetime] = None,
		end_date: Optional[datetime] = None
	) -> Dict[str, Any]:
		"""Query audit logs with optional filters
		
		Args:
			skip: Number of entries to skip (pagination)
			limit: Maximum number of entries to return
			user_id: Filter by user ID (optional)
			resource_type: Filter by resource type (optional)
			start_date: Filter entries after this date (optional)
			end_date: Filter entries before this date (optional)
			
		Returns:
			Dictionary with total count and list of audit entries
		"""
		conn = self._get_connection()
		try:
			where_clauses = []
			params = []
			
			if user_id:
				where_clauses.append('username = ?')
				params.append(user_id)
			
			if resource_type:
				where_clauses.append('event ILIKE ?')
				params.append(f'%{resource_type}%')
			
			if start_date:
				where_clauses.append('timestamp >= ?')
				params.append(start_date)
			
			if end_date:
				where_clauses.append('timestamp <= ?')
				params.append(end_date)
			
			where_clause = 'WHERE ' + ' AND '.join(where_clauses) if where_clauses else ''
			
			total_result = conn.execute(
				f'SELECT COUNT(*) FROM AUDITLOG {where_clause}',
				params
			).fetchall()
			
			total = total_result[0][0] if total_result else 0
			
			results = conn.execute(
				f'''SELECT timestamp, username, event
				   FROM AUDITLOG {where_clause}
				   ORDER BY timestamp DESC
				   LIMIT ? OFFSET ?''',
				params + [limit, skip]
			).fetchall()

			entries = []
			for row in results:
				timestamp, username, event = row

				entries.append({
					'timestamp': timestamp,
					'user_id': username,
					'event': event or ''
				})

			logger.debug(f'Retrieved {len(entries)} audit entries from AUDITLOG (total: {total})')
			return {
				'total': total,
				'skip': skip,
				'limit': limit,
				'items': entries
			}
		except Exception as e:
			logger.error(f'Error fetching audit logs: {e}')
			return {
				'total': 0,
				'skip': skip,
				'limit': limit,
				'items': []
			}
		finally:
			conn.close()

	def get_audit_logs_by_resource(
		self,
		resource_type: str,
		resource_id: str
	) -> List[Dict[str, Any]]:
		"""Get complete history of changes for a specific resource
		
		Args:
			resource_type: Type of resource
			resource_id: ID of the resource
			
		Returns:
			List of audit entries for this resource
		"""
		conn = self._get_connection()
		try:
			results = conn.execute(
				'''SELECT timestamp, username, event
				   FROM AUDITLOG
				   WHERE event ILIKE ?
				   ORDER BY timestamp DESC''',
				[f'%{resource_type}/{resource_id}%']
			).fetchall()
			
			entries = []
			for row in results:
				timestamp, username, event = row
				entries.append({
					'timestamp': timestamp,
					'user_id': username,
					'event': event or ''
				})
			
			logger.debug(f'Retrieved {len(entries)} audit entries for {resource_type}/{resource_id}')
			return entries
		except Exception as e:
			logger.error(f'Error fetching audit logs for resource: {e}')
			return []
		finally:
			conn.close()

	def get_user_actions(
		self,
		user_id: str,
		skip: int = 0,
		limit: int = 100
	) -> Dict[str, Any]:
		"""Get all actions performed by a specific user
		
		Args:
			user_id: User ID to get actions for
			skip: Number of entries to skip (pagination)
			limit: Maximum number of entries to return
			
		Returns:
			Dictionary with total count and list of audit entries
		"""
		conn = self._get_connection()
		try:
			total_result = conn.execute(
				'SELECT COUNT(*) FROM AUDITLOG WHERE username = ?',
				[user_id]
			).fetchall()
			
			total = total_result[0][0] if total_result else 0
			
			results = conn.execute(
				'''SELECT timestamp, username, event
				   FROM AUDITLOG
				   WHERE username = ?
				   ORDER BY timestamp DESC
				   LIMIT ? OFFSET ?''',
				[user_id, limit, skip]
			).fetchall()
			
			entries = []
			for row in results:
				timestamp, username, event = row
				entries.append({
					'timestamp': timestamp,
					'user_id': username,
					'event': event or ''
				})
			
			logger.debug(f'Retrieved {len(entries)} actions for user {user_id} (total: {total})')
			
			return {
				'total': total,
				'skip': skip,
				'limit': limit,
				'items': entries
			}
		except Exception as e:
			logger.error(f'Error fetching user actions: {e}')
			return {
				'total': 0,
				'skip': skip,
				'limit': limit,
				'items': []
			}
		finally:
			conn.close()

	def delete_audit_logs_older_than(self, days: int) -> int:
		"""Delete audit logs older than specified number of days
		
		Args:
			days: Number of days to keep (delete logs older than this)
			
		Returns:
			Number of deleted entries
		"""
		conn = self._get_connection()
		try:
			conn.execute(
				'''DELETE FROM AUDITLOG
				   WHERE timestamp < (CURRENT_TIMESTAMP - INTERVAL ? DAY)''',
				[days]
			)
			conn.commit()
			changes_result = conn.execute('SELECT changes()').fetchone()
			deleted_count = int(changes_result[0]) if changes_result else 0
			logger.info(f'Deleted {deleted_count} audit log entries older than {days} days')
			return deleted_count
		except Exception as e:
			logger.error(f'Error deleting old audit logs: {e}')
			return 0
		finally:
			conn.close()

	def delete_all_audit_logs(self) -> int:
		"""Delete all audit log entries
		
		Returns:
			Number of deleted entries
		"""
		conn = self._get_connection()
		try:
			before_result = conn.execute('SELECT COUNT(*) FROM AUDITLOG').fetchall()
			before_count = before_result[0][0] if before_result else 0
			conn.execute('DELETE FROM AUDITLOG')
			conn.commit()
			logger.info(f'Deleted all audit log entries ({before_count})')
			return before_count
		except Exception as e:
			logger.error(f'Error deleting all audit logs: {e}')
			return 0
		finally:
			conn.close()
