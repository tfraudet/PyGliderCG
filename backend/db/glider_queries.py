"""Database queries for Glider operations"""

import logging
from typing import Dict, Optional, List

import duckdb

from backend.config import get_settings
from backend.models.glider import Glider, Limits, Arms, Weighing, Instrument

logger = logging.getLogger(__name__)


def _get_database_connection(read_only: bool = False):
	"""Get DuckDB connection with proper configuration"""
	settings = get_settings()
	db_path = settings.DB_PATH or settings.DB_NAME
	if read_only:
		return duckdb.connect(db_path, config={'access_mode': 'READ_ONLY'})
	return duckdb.connect(db_path)


def get_all_gliders() -> Dict[str, Glider]:
	"""Fetch all gliders from database
	Returns dict with registration as key and Glider object as value"""
	try:
		conn = _get_database_connection(read_only=True)
		results = conn.execute('SELECT * from GLIDER').fetchall()

		def construct_row(values) -> Glider:
			main_values = list(values[:10])
			# Convert empty serial_number (index 3) to None
			if isinstance(main_values[3], str) and main_values[3].strip() == '':
				main_values[3] = None
			elif isinstance(main_values[3], str):
				try:
					main_values[3] = int(main_values[3])
				except (ValueError, TypeError):
					main_values[3] = None
			
			limits_value = values[10:17]
			arm_values = values[17:25]

			aGlider = Glider(*main_values)
			aGlider.limits = Limits(*limits_value)
			aGlider.arms = Arms(*arm_values)

			registration = values[1]

			points = conn.execute("SELECT * from WB_LIMIT WHERE registration='{}'".format(registration)).fetchall()
			aGlider.weight_and_balances = [(p[2], p[3]) for p in points]

			weighings = conn.execute("SELECT * from WEIGHING WHERE registration='{}'".format(registration)).fetchall()
			aGlider.weighings = [
				Weighing(
					item[0], item[1], float(item[3]), float(item[4]), float(item[5]),
					float(item[6]), float(item[7]), float(item[8]), float(item[9]), item[10], item[11]
				) for item in weighings
			]

			equipments = conn.execute("SELECT * from INVENTORY WHERE registration='{}'".format(registration)).fetchall()
			aGlider.instruments = [
				Instrument(
					id=item[0],
					on_board=item[2],
					instrument=item[3],
					brand=item[4],
					type=item[5],
					number=item[6],
					seat=item[8] if item[8] is not None else '',
					date=item[7],
				) for item in equipments
			]

			return aGlider

		rows = {x[1]: construct_row(x) for x in results}
		conn.close()
		return rows
	except Exception as e:
		logger.error(f'Error fetching all gliders: {e}')
		raise


def get_glider_by_id(registration: str) -> Optional[Glider]:
	"""Fetch a single glider by registration
	Returns Glider object or None if not found"""
	try:
		conn = _get_database_connection(read_only=True)
		results = conn.execute("SELECT * from GLIDER WHERE registration='{}'".format(registration)).fetchall()

		if not results:
			return None

		def construct_row(values) -> Glider:
			main_values = list(values[:10])
			# Convert empty serial_number (index 3) to None
			if isinstance(main_values[3], str) and main_values[3].strip() == '':
				main_values[3] = None
			elif isinstance(main_values[3], str):
				try:
					main_values[3] = int(main_values[3])
				except (ValueError, TypeError):
					main_values[3] = None
			
			limits_value = values[10:17]
			arm_values = values[17:25]

			aGlider = Glider(*main_values)
			aGlider.limits = Limits(*limits_value)
			aGlider.arms = Arms(*arm_values)

			reg = values[1]

			points = conn.execute("SELECT * from WB_LIMIT WHERE registration='{}'".format(reg)).fetchall()
			aGlider.weight_and_balances = [(p[2], p[3]) for p in points]

			weighings = conn.execute("SELECT * from WEIGHING WHERE registration='{}'".format(reg)).fetchall()
			aGlider.weighings = [
				Weighing(
					item[0], item[1], float(item[3]), float(item[4]), float(item[5]),
					float(item[6]), float(item[7]), float(item[8]), float(item[9]), item[10], item[11]
				) for item in weighings
			]

			equipments = conn.execute("SELECT * from INVENTORY WHERE registration='{}'".format(reg)).fetchall()
			aGlider.instruments = [
				Instrument(
					id=item[0],
					on_board=item[2],
					instrument=item[3],
					brand=item[4],
					type=item[5],
					number=item[6],
					seat=item[8] if item[8] is not None else '',
					date=item[7],
				) for item in equipments
			]

			return aGlider

		glider = construct_row(results[0])
		conn.close()
		return glider
	except Exception as e:
		logger.error(f'Error fetching glider {registration}: {e}')
		raise


def get_glider_by_model(model: str) -> Optional[Glider]:
	"""Fetch a glider by model name
	Returns first matching Glider or None if not found"""
	try:
		conn = _get_database_connection(read_only=True)
		results = conn.execute("SELECT * from GLIDER WHERE model='{}'".format(model)).fetchall()

		if not results:
			return None

		def construct_row(values) -> Glider:
			main_values = list(values[:10])
			# Convert empty serial_number (index 3) to None
			if isinstance(main_values[3], str) and main_values[3].strip() == '':
				main_values[3] = None
			elif isinstance(main_values[3], str):
				try:
					main_values[3] = int(main_values[3])
				except (ValueError, TypeError):
					main_values[3] = None
			
			limits_value = values[10:17]
			arm_values = values[17:25]

			aGlider = Glider(*main_values)
			aGlider.limits = Limits(*limits_value)
			aGlider.arms = Arms(*arm_values)

			reg = values[1]

			points = conn.execute("SELECT * from WB_LIMIT WHERE registration='{}'".format(reg)).fetchall()
			aGlider.weight_and_balances = [(p[2], p[3]) for p in points]

			weighings = conn.execute("SELECT * from WEIGHING WHERE registration='{}'".format(reg)).fetchall()
			aGlider.weighings = [
				Weighing(
					item[0], item[1], float(item[3]), float(item[4]), float(item[5]),
					float(item[6]), float(item[7]), float(item[8]), float(item[9]), item[10], item[11]
				) for item in weighings
			]

			equipments = conn.execute("SELECT * from INVENTORY WHERE registration='{}'".format(reg)).fetchall()
			aGlider.instruments = [
				Instrument(
					id=item[0],
					on_board=item[2],
					instrument=item[3],
					brand=item[4],
					type=item[5],
					number=item[6],
					seat=item[8] if item[8] is not None else '',
					date=item[7],
				) for item in equipments
			]

			return aGlider

		glider = construct_row(results[0])
		conn.close()
		return glider
	except Exception as e:
		logger.error(f'Error fetching glider by model {model}: {e}')
		raise


def create_glider(glider: Glider) -> bool:
	"""Create a new glider in the database
	Returns True on success"""
	try:
		conn = _get_database_connection()

		conn.execute(
			'INSERT INTO GLIDER VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
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
				glider.arms.arm_instruments_panel if glider.arms else None
			]
		)
		conn.close()
		logger.debug(f'Glider {glider.registration} created in database')
		return True
	except Exception as e:
		logger.error(f'Error creating glider {glider.registration}: {e}')
		raise


def update_glider(glider: Glider) -> bool:
	"""Update an existing glider in the database
	Returns True on success"""
	try:
		conn = _get_database_connection()

		conn.execute(
			'INSERT OR REPLACE INTO GLIDER VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			[
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
				glider.arms.arm_instruments_panel if glider.arms else None
			]
		)
		conn.close()
		logger.debug(f'Glider {glider.registration} updated in database')
		return True
	except Exception as e:
		logger.error(f'Error updating glider {glider.registration}: {e}')
		raise


def delete_glider(registration: str) -> bool:
	"""Delete a glider and all related data from the database
	Returns True on success"""
	try:
		conn = _get_database_connection()

		conn.execute('DELETE FROM WEIGHING WHERE registration=\'{}\''.format(registration))
		conn.execute('DELETE FROM WB_LIMIT WHERE registration=\'{}\''.format(registration))
		conn.execute('DELETE FROM INVENTORY WHERE registration=\'{}\''.format(registration))
		conn.execute('DELETE FROM GLIDER WHERE registration=\'{}\''.format(registration))

		conn.close()
		logger.debug(f'Glider {registration} deleted from database')
		return True
	except Exception as e:
		logger.error(f'Error deleting glider {registration}: {e}')
		raise


def save_weight_and_balance(registration: str, weight_and_balances: List[tuple]) -> bool:
	"""Save weight and balance limit points for a glider
	Returns True on success"""
	try:
		conn = _get_database_connection()

		conn.execute('DELETE FROM WB_LIMIT WHERE registration=\'{}\''.format(registration))

		for idx, point in enumerate(weight_and_balances):
			conn.execute('INSERT INTO WB_LIMIT VALUES (?, ?, ?, ?)', [
				registration,
				idx,
				point[0],
				point[1]
			])

		conn.close()
		logger.debug(f'Weight & balance for glider {registration} updated')
		return True
	except Exception as e:
		logger.error(f'Error saving weight and balance for {registration}: {e}')
		raise


def save_weighings(registration: str, weighings: List[Weighing]) -> bool:
	"""Save weighing data for a glider
	Returns True on success"""
	try:
		conn = _get_database_connection()

		for weighing in weighings:
			if weighing.id is None:
				result = conn.execute('SELECT nextval(\'auto_increment\')').fetchone()
				if result is not None:
					weighing.id = result[0]
					logger.debug(f'Next weighing id is {weighing.id}')
				else:
					raise ValueError('Could not retrieve next weighing id')

			conn.execute(
				'''INSERT OR REPLACE INTO WEIGHING
				(id, date, registration, p1, p2, right_wing_weight, left_wing_weight, tail_weight, fuselage_weight, fix_ballast_weight, A, D)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
				[
					weighing.id,
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
					weighing.D
				]
			)

		conn.close()
		logger.debug(f'Weighings for glider {registration} saved')
		return True
	except Exception as e:
		logger.error(f'Error saving weighings for {registration}: {e}')
		raise


def save_instruments(registration: str, instruments: List[Instrument]) -> bool:
	"""Save instrument/equipment data for a glider
	Returns True on success"""
	try:
		conn = _get_database_connection()

		for instrument in instruments:
			if instrument.id is None:
				result = conn.execute('SELECT nextval(\'inventory_id_seq\')').fetchone()
				if result is not None:
					instrument.id = result[0]
					logger.debug(f'Next instrument id is {instrument.id}')
				else:
					raise ValueError('Could not retrieve next instrument id')

			conn.execute(
				'''INSERT OR REPLACE INTO INVENTORY
				(id, registration, on_board, instrument, brand, type, number, date, seat)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
				[
					instrument.id,
					registration,
					instrument.on_board,
					instrument.instrument,
					instrument.brand,
					instrument.type,
					instrument.number,
					instrument.date,
					instrument.seat
				]
			)

		conn.close()
		logger.debug(f'Instruments for glider {registration} saved')
		return True
	except Exception as e:
		logger.error(f'Error saving instruments for {registration}: {e}')
		raise


def delete_instrument(registration: str, instrument_id: int) -> bool:
	"""Delete a single instrument for a glider
	Returns True if instrument existed and was deleted"""
	try:
		conn = _get_database_connection()
		exists = conn.execute(
			'SELECT 1 FROM INVENTORY WHERE registration = ? AND id = ? LIMIT 1',
			[registration, instrument_id],
		).fetchone()
		if not exists:
			conn.close()
			return False

		conn.execute(
			'DELETE FROM INVENTORY WHERE registration = ? AND id = ?',
			[registration, instrument_id],
		)
		conn.close()
		logger.debug(f'Instrument {instrument_id} for glider {registration} deleted')
		return True
	except Exception as e:
		logger.error(f'Error deleting instrument {instrument_id} for {registration}: {e}')
		raise


def delete_weighing(registration: str, weighing_id: int) -> bool:
	"""Delete a single weighing for a glider
	Returns True if weighing existed and was deleted"""
	try:
		conn = _get_database_connection()
		exists = conn.execute(
			'SELECT 1 FROM WEIGHING WHERE registration = ? AND id = ? LIMIT 1',
			[registration, weighing_id],
		).fetchone()
		if not exists:
			conn.close()
			return False

		conn.execute(
			'DELETE FROM WEIGHING WHERE registration = ? AND id = ?',
			[registration, weighing_id],
		)
		conn.close()
		logger.debug(f'Weighing {weighing_id} for glider {registration} deleted')
		return True
	except Exception as e:
		logger.error(f'Error deleting weighing {weighing_id} for {registration}: {e}')
		raise
