from dataclasses import dataclass, field, fields
from datetime import date
from enum import Enum
import logging

import duckdb
import pandas as pd
import streamlit as st

from audit_log import AuditLogDuckDB
from config import get_database_name

logger = logging.getLogger(__name__)
audit = AuditLogDuckDB()

@st.cache_data
def fetch_gliders(show_spinner = 'Loading gliders'):
	logger.info('Loading gliders from database...')
	return Glider.from_database(get_database_name())

class DatumWeighingPoints(Enum):
	DATUM_WING_2POINTS_AFT_OF_DATUM = 1
	DATUM_WING_1POINT_AFT_OF_DATUM = 2
	DATUM_WING_WHEEL_FORWARD_OF_DATUM = 3
	DATUM_FORWARD_GLIDER = 4

class DatumPilotPosition(Enum):
	PILOT_FORWARD_OF_DATUM = 1
	PILOT_AFT_OF_DATUM = 2

DATUMS = {
	DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM: {
			'label': 'Bord d\'attaque de l\'aile - 2 point en arrière de la référence',
			'image': 'img/datum-hd-1.png'
		},
	DatumWeighingPoints.DATUM_WING_1POINT_AFT_OF_DATUM: {
			'label': 'Bord d\'attaque de l\'aile - 1 point en avant de la référence',
			'image': 'img/datum-hd-2.png',
	   },
	DatumWeighingPoints.DATUM_WING_WHEEL_FORWARD_OF_DATUM: {
			'label' : 'Bord d\'attaque de l\'aile - Train principal en avant de la référence',
			'image': 'img/datum-hd-4.png',
		},
	DatumWeighingPoints.DATUM_FORWARD_GLIDER: {
			'label' : 'Devant le planeur - 2 point en arrière de la référence',
			'image': 'img/datum-hd-snc34c.png',
		}
	# DatumWeighingPoints.DATUM_FORWARD_GLIDER: {
	# 		'label' : 'Devant le planeur',
	# 		'image': 'img/datum-hd-3.png',
	# 	}
}

def get_datum_image_by_label(label):
	datum = next(filter(lambda item: item[1]['label'] == label, DATUMS.items()), None)
	return datum[1].get('image') if datum else None

@dataclass
class Limits:
	# weight limits
	mmwp : float
	mmwv : float
	mmenp : float
	mm_harnais : float
	weight_min_pilot : float

	# centering limits
	front_centering : float
	rear_centering : float

@dataclass
class Arms:
	arm_front_pilot : float
	arm_rear_pilot : float
	arm_waterballast : float
	arm_front_ballast: float
	arm_rear_watterballast_or_ballast : float
	arm_gas_tank : float
	arm_instruments_panel : float

@dataclass
class Weighing:
	id : int
	date : date
	p1: float
	p2: float
	right_wing_weight: float
	left_wing_weight: float
	tail_weight: float
	fuselage_weight: float
	fix_ballast_weight: float = 0.0
	A: int = 0
	D: int = 0

	def delete(self):
		dbname = get_database_name()
		try:
			conn = duckdb.connect(dbname)
			conn.execute('DELETE FROM WEIGHING WHERE id={}'.format(self.id))
		except Exception as e:	
			logger.error(f'Error on database {dbname} when deleting weighing: {e}')
		finally:
			conn.close()
		logger.debug('{} deleted from the database'.format(self))
		audit.log(st.session_state.username, 'Weighing #{} from {} deleted'.format(self.id, self.date))

	def mve(self) -> float:
		'''
		Retourne la masse a vide équipée (MVE) en Kg
		'''
		return round(self.right_wing_weight + self.left_wing_weight + self.tail_weight + self.fuselage_weight + self.fix_ballast_weight, 2)

	def mvenp(self) -> float:
		'''
		Retourne la masse à vide des élements non portants (MVENP) en Kg
		'''
		return round(self.tail_weight + self.fuselage_weight + self.fix_ballast_weight, 2)

@dataclass
class Instrument:
	id : int
	on_board: bool
	instrument : str
	brand: str
	type: str
	number: str
	date: date
	seat: str

	def delete(self):
		dbname = get_database_name()
		try:
			conn = duckdb.connect(dbname)
			conn.execute('DELETE FROM INVENTORY WHERE id={}'.format(self.id))
		except Exception as e:	
			logger.error(f'Error on database {dbname} when deleting instrument: {e}')
		finally:
			conn.close()
		logger.debug('{} deleted from the database'.format(self))
		audit.log(st.session_state.username, 'Instruments {} deleted'.format(self.instrument))

@dataclass
class Glider:
	model : str
	registration : str
	brand : str
	serial_number : int
	single_seat : bool
	datum : int
	pilot_position : int 
	datum_label : str
	wedge : str
	wedge_position : str
		
	limits : Limits = None
	arms: Arms = None

	weighings : list[Weighing] = field(default_factory=list)
	weight_and_balances: list[(int, float)] = field(default_factory=list)  # list of tuple (centering in mm, weight in Kg)
	instruments: list[Instrument] = field(default_factory=list)

	def limits_to_pandas(self) -> pd.DataFrame:
		return pd.DataFrame(self.weight_and_balances, columns=['centering', 'mass'])
	
	def get_instrument_by_id(self, id : int) -> Instrument:
		return next((instrument for instrument in self.instruments if instrument.id == id), None)
	
	def get_weighing_by_id(self, id : int) -> Instrument:
		return next((weighing for weighing in self.weighings if weighing.id == id), None)
	
	def instruments_to_pandas(self) -> pd.DataFrame:
		return pd.DataFrame(self.instruments, columns=['id', 'on_board', 'instrument', 'brand', 'type', 'number', 'date', 'seat'])

	def weight_and_balances_to_pandas(self) -> pd.DataFrame:
		return pd.DataFrame(self.weight_and_balances, columns=['balance', 'weight'])
	
	def wheighings_to_pandas(self) -> pd.DataFrame:
		columns = ['id', 'date', 'p1', 'p2', 'right_wing_weight', 'left_wing_weight', 'tail_weight', 'fuselage_weight', 'fix_ballast_weight', 'A', 'D']
		# as_dicts = [dict(zip(columns, [weighing[0]] + [getattr(weighing[1], field.name) for field in fields(weighing[1])])) for weighing in self.weighings]
		return pd.DataFrame(self.weighings, columns=columns)

	def save(self):
		logger.debug('save {} in database'.format(self))
		dbname = get_database_name()
		try:
			conn = duckdb.connect(get_database_name())

			# save the glider datasheet
			conn.execute('INSERT OR REPLACE INTO GLIDER VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',[
				self.model,
				self.registration,
				self.brand,
				self.serial_number,
				self.single_seat,
				
				# Datum for weighings
				self.datum,
				self.pilot_position,
				self.datum_label,
				self.wedge,
				self.wedge_position,

				# Limits
				self.limits.mmwp,
				self.limits.mmwv,
				self.limits.mmenp,
				self.limits.mm_harnais,
				self.limits.weight_min_pilot,
				self.limits.front_centering,
				self.limits.rear_centering,

				# Arms
				self.arms.arm_front_pilot,
				self.arms.arm_rear_pilot,
				self.arms.arm_waterballast,
				self.arms.arm_front_ballast,
				self.arms.arm_rear_watterballast_or_ballast,
				self.arms.arm_gas_tank,
				self.arms.arm_instruments_panel
			])
		except Exception as e:	
			logger.error(f'Error on database {dbname} when saving glider: {e}')
		finally:
			conn.close()
		logger.debug('{} datasheet saved in database'.format(self.registration))
		audit.log(st.session_state.username, 'Datasheet for glider {} updated'.format(self.registration))

	def save_weight_and_balance(self):
		dbname = get_database_name()
		try:
			conn = duckdb.connect(dbname)
	
			#  Delete all points
			conn.execute('DELETE FROM WB_LIMIT WHERE registration=\'{}\''.format(self.registration))

			# store the new points
			for idx, point in enumerate(self.weight_and_balances):
				conn.execute('INSERT INTO WB_LIMIT VALUES (?, ?, ?, ?)',[
					self.registration,
					idx,
					point[0],
					point[1]
				])

			logger.debug('Weight & balance for glider {} updated'.format(self.registration))
		except Exception as e:	
			logger.error(f'Error on database {dbname} when saving weight and balance limits: {e}')
		finally:
			conn.close()	
		audit.log(st.session_state.username, 'Weight & balance {} for glider {} updated'.format(self.weight_and_balances, self.registration))

	def save_instruments(self):
		dbname = get_database_name()
		try:
			conn = duckdb.connect(dbname)
			for instrument in self.instruments:
				if instrument.id is None:
					instrument.id = conn.execute('SELECT nextval(\'inventory_id_seq\')').fetchone()[0]
					logger.debug('Next instrument id is {} '.format(instrument.id))

				conn.execute('''
						INSERT OR REPLACE INTO INVENTORY (id, registration, on_board, instrument, brand, type, number, date, seat)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
					''', [
						instrument.id,
						self.registration,
						instrument.on_board,
						instrument.instrument,
						instrument.brand,
						instrument.type,
						instrument.number,
						instrument.date,
						instrument.seat
					])
				logger.debug('{} instrument saved in database'.format(instrument))
		except Exception as e:	
			logger.error(f'Error on database {dbname} when saving instruments: {e}')
		finally:
			conn.close()
		logger.debug('{} instruments saved in database'.format(self.registration))
		audit.log(st.session_state.username, 'Instruments {} updated for glider {} '.format(self.instruments, self.registration))

	def save_weighings(self):
		dbname = get_database_name()
		try:
			conn = duckdb.connect(dbname)
			for weighing in self.weighings:
				if weighing.id is None:
					weighing.id = conn.execute('SELECT nextval(\'auto_increment\')').fetchone()[0]
					logger.debug('Next weighing id is {} '.format(weighing.id))

				conn.execute('''
						INSERT OR REPLACE INTO WEIGHING (id, date, registration, p1, p2, right_wing_weight, left_wing_weight, tail_weight, fuselage_weight, fix_ballast_weight, A, D)
						VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
					''', [
						weighing.id,
						weighing.date,
						self.registration,
						weighing.p1,
						weighing.p2,
						weighing.right_wing_weight,
						weighing.left_wing_weight,
						weighing.tail_weight,
						weighing.fuselage_weight,
						weighing.fix_ballast_weight,
						weighing.A,
						weighing.D
					])
				logger.debug('{} instrument saved in database'.format(weighing))
		except Exception as e:	
			logger.error(f'Error on database {dbname} when saving weighings: {e}')
		finally:
			conn.close()
		logger.debug('{} weighings saved in database'.format(self.registration))
		audit.log(st.session_state.username, 'Weighings {} updated for glider {} '.format(self.weighings, self.registration))

	def delete(self):
		dbname = get_database_name()
		try:
			conn = duckdb.connect(dbname)
			# conn.begin()

			#  Delete all weihings 
			conn.execute('DELETE FROM WEIGHING WHERE registration=\'{}\''.format(self.registration))

			#  Delete all center of gravity and weight points
			conn.execute('DELETE FROM WB_LIMIT WHERE registration=\'{}\''.format(self.registration))
				
			#  Delete related entries in the INVENTORY table
			conn.execute('DELETE FROM INVENTORY WHERE registration=\'{}\''.format(self.registration))

			#  Delete the entry in the GLIDER table
			conn.execute('DELETE FROM GLIDER WHERE registration=\'{}\''.format(self.registration))

			# conn.commit()
			logger.debug('{} deleted from the database'.format(self.registration))
		except Exception as e:	
			logger.error(f'Error on database {dbname} when delete: {e}')		
		finally:
			conn.close()
		audit.log(st.session_state.username, 'Glider {} deleted'.format(self.registration))

	@classmethod
	def from_database(cls, database_name: str) -> dict:
		conn = duckdb.connect(database_name, config = {'access_mode': 'READ_ONLY'})
		results  = conn.execute('SELECT * from GLIDER').fetchall()

		def construct_row(values) -> Glider:
			main_values = values[:10]
			limits_value = values[10:17]
			arm_values = values[17:25]

			aGlider = Glider(*main_values)
			aGlider.limits = Limits(*limits_value)
			aGlider.arms = Arms(*arm_values)

			# load weight & balanace limit points for this glider
			points = conn.execute("SELECT * from WB_LIMIT WHERE registration='{}'".format(values[1])).fetchall()
			aGlider.weight_and_balances = [(p[2], p[3]) for p in points]

			# load weighings for this glider
			weighings = conn.execute("SELECT * from WEIGHING WHERE registration='{}'".format(values[1])).fetchall()
			# aGlider.weighings = [ Weighing(item[0], item[1], *item[3:]) for item in weighings]
			aGlider.weighings = [ Weighing(
				item[0], item[1], float(item[3]), float(item[4]), float(item[5]), float(item[6]), float(item[7]), float(item[8]), float(item[9]), item[10], item[11]
			) for item in weighings]

			# load equipements for this glider
			equipments = conn.execute("SELECT * from INVENTORY WHERE registration='{}'".format(values[1])).fetchall()
			aGlider.instruments = [ Instrument(item[0], *item[2:9]) for item in equipments]

			return aGlider
		
		rows = { x[1]: construct_row(x) for x in results}
		conn.close()
		return rows
	
	def last_weighing(self) -> Weighing:
		return max(self.weighings, key=lambda x: x.date) if len(self.weighings)>0 else None
	
	def empty_weight(self) -> float:
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')
		
		# p1 + p2 should be equals to mve
		return last_weighing.mve()
		# return last_weighing.p1 + last_weighing.p2
	
	def cv_max(self) -> float:
		'''
		Retourne la charge variable maximum en kg, défini comme la différence entre la masse maximale de l'appareil waterballast vide et la masse à vide équipée.
		CV max = MMA - MVE
		'''
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')
		
		# return round(self.limits.mmwp - last_weighing.mve(), 2)
		return round(self.limits.mmwv - last_weighing.mve(), 2)

	def cu_max(self) -> float:
		'''
		Retourne la charge utile maximum en kg, défini comme la différence entre la masse maximale des elements non portant
		et la masse à vide des élement non portant. CU max = MMWV - MVENP
		'''
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')
		
		return round(self.limits.mmenp - last_weighing.mvenp(), 2)
	
	def cu(self) -> float:
		'''
		Retourne la charge utile en kg, défini comme le minimum entre la charge variable max et la charge utile max
		'''
		return min(self.cv_max(), self.cu_max())
	
	def pilot_av_mini(self) -> float:
		mass_mini_pilot = None
		if self.pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value:
			# Masse à vide * (X0 - limite centrage arrière) / Bras de levier pilote + limite centrage arrière
			mass_mini_pilot = self.empty_weight() * (self.empty_arm() - self.limits.rear_centering) / (self.arms.arm_front_pilot + self.limits.rear_centering)
		elif self.pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM.value:
			if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
				# Masse à vide * (X0 - limite centrage arrière ) / limite centrage arrière - Bras de levier pilote avant
				mass_mini_pilot = self.empty_weight() * (self.limits.rear_centering - self.empty_arm()) / (self.limits.rear_centering - self.arms.arm_front_pilot)
			elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
				# (p1 + p2) * (X0 - limite centrage arrière ) / limite centrage arrière - Bras de levier pilote avant
				mass_mini_pilot = self.empty_weight() * (self.empty_arm() - self.limits.rear_centering) / (self.limits.rear_centering - self.arms.arm_front_pilot)
			else:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
		return round(mass_mini_pilot,1)

	def pilot_av_mini_duo(self) -> float:
		mass_mini_pilot = None
		if self.pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value:
			# TODO: check calculation
			return self.pilot_av_mini()
		elif self.pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM.value:
			if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
			elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
				# masse mini pilot avant solo - (masse mini pilote  * ((limite centrage arrière - bras de levier pilote avant) / (limite centrage arrière - bras de levier pilote avant)
				mass_mini_pilot = self.pilot_av_mini() - ( self.limits.weight_min_pilot * (self.limits.rear_centering - self.arms.arm_rear_pilot)) / (self.limits.rear_centering - self.arms.arm_front_pilot)
			else:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
		return round(mass_mini_pilot,1)

	def pilot_av_maxi(self) -> float:
		mass_maxi_pilot = None
		if self.pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value:
			# Masse à vide * (X0 - limite centrage avant) / Bras de levier pilote + limite centrage avant
			mass_maxi_pilot = self.empty_weight() * (self.empty_arm() - self.limits.front_centering) / (self.arms.arm_front_pilot + self.limits.front_centering)
		elif self.pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM.value:
			if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
				# Masse à vide * (X0 - limite centrage avant ) / limite centrage avant - Bras de levier pilote
				mass_maxi_pilot = self.empty_weight() * (self.limits.front_centering - self.empty_arm()) / (self.limits.front_centering - self.arms.arm_front_pilot)
			elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
				# (p1 + p2) * (X0 - limite centrage avant ) / limite centrage avant - Bras de levier pilote avant
				mass_maxi_pilot = self.empty_weight() * (self.empty_arm() - self.limits.front_centering) / (self.limits.front_centering - self.arms.arm_front_pilot)
			else:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
		return round(mass_maxi_pilot,1)

	def empty_arm(self) -> float:
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')
		
		if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
			# X0 = D1 + d , D1 = M2 * D / (M1 + M2)
			D1 = last_weighing.D * last_weighing.p2 / (last_weighing.p1 + last_weighing.p2)
			x0 = D1 + last_weighing.A
			return round(x0,0)
		elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
			x0 = last_weighing.D - (last_weighing.p1 * (last_weighing.D - last_weighing.A))/(last_weighing.p1 + last_weighing.p2)
			return round(x0,0)
		else:
			raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
	
	def weight_and_balance_calculator(self, front_pilot_weight, rear_pilot_weight, front_ballast_weight, rear_ballast_weight, wing_water_ballast_weight):
		'''
		return the total weight of the glider (kg) and the balance (mm)
		'''

		glider_weight = self.empty_weight() + front_pilot_weight + rear_pilot_weight + front_ballast_weight + rear_ballast_weight + wing_water_ballast_weight
		if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
			moment_arm = (
					self.empty_weight() * self.empty_arm() +
					front_pilot_weight * self.arms.arm_front_pilot * -1 +
					rear_pilot_weight * self.arms.arm_rear_pilot * -1 +
					front_ballast_weight * self.arms.arm_front_ballast *-1 +
					rear_ballast_weight * self.arms.arm_rear_watterballast_or_ballast +
					wing_water_ballast_weight * self.arms.arm_waterballast
				)
			return glider_weight, moment_arm / glider_weight
		elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
			moment_arm = (
					self.empty_weight() * self.empty_arm() +
					front_pilot_weight * self.arms.arm_front_pilot +
					rear_pilot_weight * self.arms.arm_rear_pilot +
					front_ballast_weight * self.arms.arm_front_ballast +
					rear_ballast_weight * self.arms.arm_rear_watterballast_or_ballast +
					wing_water_ballast_weight * self.arms.arm_waterballast
				)
			return glider_weight, moment_arm / glider_weight
		else:
			raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))


