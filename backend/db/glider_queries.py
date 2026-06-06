"""Database queries for Glider operations."""

import logging
import math
from typing import Dict, List, Optional, Sequence

import duckdb

from backend.config import get_settings
from backend.models.glider import Arms, Glider, Instrument, Limits, Weighing

logger = logging.getLogger(__name__)


def _get_database_connection(read_only: bool = False):
	"""Get DuckDB connection with proper configuration."""
	settings = get_settings()
	if read_only:
		return duckdb.connect(settings.DB_NAME, config={'access_mode': 'READ_ONLY'})
	return duckdb.connect(settings.DB_NAME)


def _normalize_serial_number(value) -> Optional[int]:
	if isinstance(value, str):
		raw = value.strip()
		if raw == '':
			return None
		try:
			return int(raw)
		except (TypeError, ValueError):
			return None
	return value


def _next_sequence_value(conn, sequence_name: str) -> int:
	result = conn.execute(f"SELECT nextval('{sequence_name}')").fetchone()
	if result is None:
		raise ValueError(f'Could not retrieve next value for {sequence_name}')
	return int(result[0])


def _normalize_float(value, digits: int = 3):
	if value is None:
		return None
	number = float(value)
	if not math.isfinite(number):
		return number
	return round(number, digits)


def _glider_values(glider: Glider) -> List:
	return [
		glider.model,
		glider.registration,
		glider.brand,
		glider.serial_number,
		glider.single_seat,
		glider.datum,
		glider.pilot_position,
		glider.datum_label,
		glider.wedge,
		glider.wedge_position,
		glider.limits.mmwp if glider.limits else None,
		glider.limits.mmwv if glider.limits else None,
		glider.limits.mmenp if glider.limits else None,
		glider.limits.mm_harnais if glider.limits else None,
		glider.limits.weight_min_pilot if glider.limits else None,
		glider.limits.front_centering if glider.limits else None,
		glider.limits.rear_centering if glider.limits else None,
		glider.arms.arm_front_pilot if glider.arms else None,
		glider.arms.arm_rear_pilot if glider.arms else None,
		glider.arms.arm_waterballast if glider.arms else None,
		glider.arms.arm_front_ballast if glider.arms else None,
		glider.arms.arm_rear_watterballast_or_ballast if glider.arms else None,
		glider.arms.arm_gas_tank if glider.arms else None,
		glider.arms.arm_instruments_panel if glider.arms else None,
	]


def _build_glider_from_row(conn, row: Sequence) -> Glider:
	main_values = list(row[:10])
	main_values[3] = _normalize_serial_number(main_values[3])

	glider = Glider(*main_values)
	glider.limits = Limits(*[_normalize_float(value) for value in row[10:17]])
	glider.arms = Arms(*[_normalize_float(value) for value in row[17:25]])

	registration = row[1]
	points = conn.execute(
		'''SELECT center_of_gravity, weight
		FROM WB_LIMIT
		WHERE registration = ?
		ORDER BY point_index''',
		[registration],
	).fetchall()
	glider.weight_and_balances = [(point[0], _normalize_float(point[1])) for point in points]

	weighing_rows = conn.execute(
		'''SELECT id, date, p1, p2, right_wing_weight, left_wing_weight, tail_weight,
		fuselage_weight, fix_ballast_weight, A, D
		FROM WEIGHING
		WHERE registration = ?''',
		[registration],
	).fetchall()
	glider.weighings = [
		Weighing(
			id=item[0],
			date=item[1],
			p1=float(item[2]),
			p2=float(item[3]),
			right_wing_weight=float(item[4]),
			left_wing_weight=float(item[5]),
			tail_weight=float(item[6]),
			fuselage_weight=float(item[7]),
			fix_ballast_weight=float(item[8]),
			A=item[9],
			D=item[10],
		)
		for item in weighing_rows
	]

	instrument_rows = conn.execute(
		'''SELECT id, on_board, instrument, brand, type, number, date, seat
		FROM INVENTORY
		WHERE registration = ?''',
		[registration],
	).fetchall()
	glider.instruments = [
		Instrument(
			id=item[0],
			on_board=item[1],
			instrument=item[2],
			brand=item[3],
			type=item[4],
			number=item[5],
			date=item[6],
			seat=item[7] or '',
		)
		for item in instrument_rows
	]

	return glider


def get_all_gliders() -> Dict[str, Glider]:
	"""Fetch all gliders from database keyed by registration."""
	conn = _get_database_connection(read_only=True)
	try:
		rows = conn.execute('SELECT * FROM GLIDER').fetchall()
		return {row[1]: _build_glider_from_row(conn, row) for row in rows}
	except Exception as e:
		logger.error(f'Error fetching all gliders: {e}')
		raise
	finally:
		conn.close()


def get_glider_by_id(registration: str) -> Optional[Glider]:
	"""Fetch a single glider by registration."""
	conn = _get_database_connection(read_only=True)
	try:
		row = conn.execute(
			'SELECT * FROM GLIDER WHERE registration = ?',
			[registration],
		).fetchone()
		if row is None:
			return None
		return _build_glider_from_row(conn, row)
	except Exception as e:
		logger.error(f'Error fetching glider {registration}: {e}')
		raise
	finally:
		conn.close()


def get_glider_by_model(model: str) -> Optional[Glider]:
	"""Fetch first glider matching model."""
	conn = _get_database_connection(read_only=True)
	try:
		row = conn.execute(
			'SELECT * FROM GLIDER WHERE model = ? LIMIT 1',
			[model],
		).fetchone()
		if row is None:
			return None
		return _build_glider_from_row(conn, row)
	except Exception as e:
		logger.error(f'Error fetching glider by model {model}: {e}')
		raise
	finally:
		conn.close()


def create_glider(glider: Glider) -> bool:
	"""Create a new glider in the database."""
	conn = _get_database_connection()
	try:
		conn.execute(
			'INSERT INTO GLIDER VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			_glider_values(glider),
		)
		logger.debug(f'Glider {glider.registration} created in database')
		return True
	except Exception as e:
		logger.error(f'Error creating glider {glider.registration}: {e}')
		raise
	finally:
		conn.close()


def update_glider(glider: Glider) -> bool:
	"""Update an existing glider in the database."""
	conn = _get_database_connection()
	try:
		conn.execute(
			'INSERT OR REPLACE INTO GLIDER VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			_glider_values(glider),
		)
		logger.debug(f'Glider {glider.registration} updated in database')
		return True
	except Exception as e:
		logger.error(f'Error updating glider {glider.registration}: {e}')
		raise
	finally:
		conn.close()


def delete_glider(registration: str) -> bool:
	"""Delete a glider and all related data from the database."""
	conn = _get_database_connection()
	try:
		for table in ('WEIGHING', 'WB_LIMIT', 'INVENTORY', 'GLIDER'):
			conn.execute(f'DELETE FROM {table} WHERE registration = ?', [registration])
		logger.debug(f'Glider {registration} deleted from database')
		return True
	except Exception as e:
		logger.error(f'Error deleting glider {registration}: {e}')
		raise
	finally:
		conn.close()


def save_weight_and_balance(registration: str, weight_and_balances: List[tuple]) -> bool:
	"""Save weight and balance limit points for a glider."""
	conn = _get_database_connection()
	try:
		conn.execute('DELETE FROM WB_LIMIT WHERE registration = ?', [registration])
		for point_index, point in enumerate(weight_and_balances):
			conn.execute(
				'INSERT INTO WB_LIMIT VALUES (?, ?, ?, ?)',
				[registration, point_index, point[0], point[1]],
			)
		logger.debug(f'Weight & balance for glider {registration} updated')
		return True
	except Exception as e:
		logger.error(f'Error saving weight and balance for {registration}: {e}')
		raise
	finally:
		conn.close()


def save_weighings(registration: str, weighings: List[Weighing]) -> bool:
	"""Save weighing data for a glider."""
	conn = _get_database_connection()
	try:
		for weighing in weighings:
			weighing_id = weighing.id
			if weighing_id is None:
				weighing_id = _next_sequence_value(conn, 'auto_increment')
				weighing.id = weighing_id
				logger.debug(f'Next weighing id is {weighing.id}')

			conn.execute(
				'''INSERT OR REPLACE INTO WEIGHING
				(id, date, registration, p1, p2, right_wing_weight, left_wing_weight, tail_weight, fuselage_weight, fix_ballast_weight, A, D)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
				[
					weighing_id,
					weighing.date,
					registration,
					weighing.p1,
					weighing.p2,
					weighing.right_wing_weight,
					weighing.left_wing_weight,
					weighing.tail_weight,
					weighing.fuselage_weight,
					weighing.fix_ballast_weight,
					weighing.A,
					weighing.D,
				],
			)
		logger.debug(f'Weighings for glider {registration} saved')
		return True
	except Exception as e:
		logger.error(f'Error saving weighings for {registration}: {e}')
		raise
	finally:
		conn.close()


def save_instruments(registration: str, instruments: List[Instrument]) -> bool:
	"""Save instrument/equipment data for a glider."""
	conn = _get_database_connection()
	try:
		for instrument in instruments:
			instrument_id = instrument.id
			if instrument_id is None:
				instrument_id = _next_sequence_value(conn, 'inventory_id_seq')
				instrument.id = instrument_id
				logger.debug(f'Next instrument id is {instrument.id}')

			conn.execute(
				'''INSERT OR REPLACE INTO INVENTORY
				(id, registration, on_board, instrument, brand, type, number, date, seat)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
				[
					instrument_id,
					registration,
					instrument.on_board,
					instrument.instrument,
					instrument.brand,
					instrument.type,
					instrument.number,
					instrument.date,
					instrument.seat,
				],
			)
		logger.debug(f'Instruments for glider {registration} saved')
		return True
	except Exception as e:
		logger.error(f'Error saving instruments for {registration}: {e}')
		raise
	finally:
		conn.close()


def delete_instrument(registration: str, instrument_id: int) -> bool:
	"""Delete a single instrument for a glider."""
	conn = _get_database_connection()
	try:
		exists = conn.execute(
			'SELECT 1 FROM INVENTORY WHERE registration = ? AND id = ? LIMIT 1',
			[registration, instrument_id],
		).fetchone()
		if not exists:
			return False

		conn.execute(
			'DELETE FROM INVENTORY WHERE registration = ? AND id = ?',
			[registration, instrument_id],
		)
		logger.debug(f'Instrument {instrument_id} for glider {registration} deleted')
		return True
	except Exception as e:
		logger.error(f'Error deleting instrument {instrument_id} for {registration}: {e}')
		raise
	finally:
		conn.close()


def delete_weighing(registration: str, weighing_id: int) -> bool:
	"""Delete a single weighing for a glider."""
	conn = _get_database_connection()
	try:
		exists = conn.execute(
			'SELECT 1 FROM WEIGHING WHERE registration = ? AND id = ? LIMIT 1',
			[registration, weighing_id],
		).fetchone()
		if not exists:
			return False

		conn.execute(
			'DELETE FROM WEIGHING WHERE registration = ? AND id = ?',
			[registration, weighing_id],
		)
		logger.debug(f'Weighing {weighing_id} for glider {registration} deleted')
		return True
	except Exception as e:
		logger.error(f'Error deleting weighing {weighing_id} for {registration}: {e}')
		raise
	finally:
		conn.close()
