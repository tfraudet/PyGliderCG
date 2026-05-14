"""Database queries for weighing data"""

import logging
from typing import Optional, List
from datetime import date
import duckdb

logger = logging.getLogger(__name__)


class WeighingQueries:
	"""Database queries related to weighing data"""

	@staticmethod
	def get_weighing_by_id(db_path: str, weighing_id: int) -> Optional[dict]:
		"""Retrieve a single weighing record by ID"""
		try:
			conn = duckdb.connect(db_path, config={'access_mode': 'READ_ONLY'})
			result = conn.execute(
				'SELECT * FROM WEIGHING WHERE id = ?', [weighing_id]
			).fetchone()
			conn.close()
			return result
		except Exception as e:
			logger.error(f'Error fetching weighing {weighing_id}: {e}')
			return None

	@staticmethod
	def get_weighings_by_glider(db_path: str, glider_registration: str) -> List[dict]:
		"""Retrieve all weighing records for a glider"""
		try:
			conn = duckdb.connect(db_path, config={'access_mode': 'READ_ONLY'})
			results = conn.execute(
				'SELECT * FROM WEIGHING WHERE registration = ? ORDER BY date DESC',
				[glider_registration],
			).fetchall()
			conn.close()
			return results if results else []
		except Exception as e:
			logger.error(f'Error fetching weighings for {glider_registration}: {e}')
			return []

	@staticmethod
	def get_latest_weighing(db_path: str, glider_registration: str) -> Optional[dict]:
		"""Retrieve the most recent weighing for a glider"""
		try:
			conn = duckdb.connect(db_path, config={'access_mode': 'READ_ONLY'})
			result = conn.execute(
				'''SELECT * FROM WEIGHING
				WHERE registration = ?
				ORDER BY date DESC
				LIMIT 1''',
				[glider_registration],
			).fetchone()
			conn.close()
			return result
		except Exception as e:
			logger.error(
				f'Error fetching latest weighing for {glider_registration}: {e}'
			)
			return None

	@staticmethod
	def save_weighing_calculation(
		db_path: str,
		weighing_id: int,
		glider_registration: str,
		mve: float,
		mvenp: float,
		empty_arm: float,
		notes: Optional[str] = None,
	) -> bool:
		"""Save calculated weighing data (requires write access)"""
		try:
			conn = duckdb.connect(db_path)
			# This would require a WEIGHING_CALCULATIONS table or similar
			# For now, we just log it
			logger.info(
				f'Calculated: weighing_id={weighing_id}, mve={mve}, mvenp={mvenp}, empty_arm={empty_arm}'
			)
			conn.close()
			return True
		except Exception as e:
			logger.error(f'Error saving weighing calculation: {e}')
			return False

	@staticmethod
	def get_weighing_history(
		db_path: str,
		glider_registration: str,
		limit: int = 10,
	) -> List[dict]:
		"""Get weighing history for a glider"""
		try:
			conn = duckdb.connect(db_path, config={'access_mode': 'READ_ONLY'})
			results = conn.execute(
				'''SELECT id, registration, date, p1, p2, A, D,
					right_wing_weight, left_wing_weight, tail_weight,
					fuselage_weight, fix_ballast_weight
				FROM WEIGHING
				WHERE registration = ?
				ORDER BY date DESC
				LIMIT ?''',
				[glider_registration, limit],
			).fetchall()
			conn.close()
			return results if results else []
		except Exception as e:
			logger.error(f'Error fetching weighing history for {glider_registration}: {e}')
			return []

	@staticmethod
	def get_weighings_after_date(
		db_path: str,
		glider_registration: str,
		start_date: date,
	) -> List[dict]:
		"""Get weighing records after a specific date"""
		try:
			conn = duckdb.connect(db_path, config={'access_mode': 'READ_ONLY'})
			results = conn.execute(
				'''SELECT * FROM WEIGHING
				WHERE registration = ? AND date >= ?
				ORDER BY date DESC''',
				[glider_registration, start_date],
			).fetchall()
			conn.close()
			return results if results else []
		except Exception as e:
			logger.error(
				f'Error fetching weighings after {start_date} for {glider_registration}: {e}'
			)
			return []
