from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
import logging
from typing import List, Tuple, Optional

import pandas as pd
import streamlit as st

from backend_client import BackendClient

logger = logging.getLogger(__name__)

@st.cache_data
def fetch_gliders(show_spinner = 'Loading gliders'):
	logger.info('Loading gliders from backend API...')
	return Glider.from_backend()

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
	registration: Optional[str] = None

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
	seat: str
	date: Optional[date]
	registration: Optional[str] = None

@dataclass
class Glider:
	model : str
	registration : str
	brand : str
	serial_number : Optional[int]
	single_seat : bool
	datum : int
	pilot_position : int 
	datum_label : str
	wedge : str
	wedge_position : str
		
	limits : Optional[Limits] = None
	arms: Optional[Arms] = None
	weighings : List[Weighing] = field(default_factory=list)
	weight_and_balances: List[Tuple[int, float]] = field(default_factory=list)  # list of tuple (centering in mm, weight in Kg)
	instruments: List[Instrument] = field(default_factory=list)

	def limits_to_pandas(self) -> pd.DataFrame:
		return pd.DataFrame(self.weight_and_balances, columns=['centering', 'mass'])

	@staticmethod
	def _parse_date(value):
		if value is None or value == '':
			return None
		if isinstance(value, date):
			return value
		if isinstance(value, datetime):
			return value.date()
		if isinstance(value, str):
			return datetime.fromisoformat(value).date()
		return value

	@classmethod
	def from_backend(cls) -> dict:
		client = BackendClient()
		rows = {}

		def _required_date(value: Optional[date], field_name: str, registration: str) -> date:
			if value is None:
				raise ValueError(f'Missing {field_name} for {registration}')
			return value

		for glider_data in client.get_gliders(skip=0, limit=1000):
			registration = glider_data.get('registration')
			if not registration:
				continue

			serial_number = glider_data.get('serial_number')
			if isinstance(serial_number, str) and serial_number.strip() == '':
				serial_number = None
			elif isinstance(serial_number, str):
				try:
					serial_number = int(serial_number)
				except ValueError:
					serial_number = None

			limits_data = glider_data.get('limits')
			arms_data = glider_data.get('arms')
			parsed = Glider(
				glider_data.get('model', ''),
				registration,
				glider_data.get('brand', ''),
				serial_number,
				glider_data.get('single_seat', False),
				glider_data.get('datum', 1),
				glider_data.get('pilot_position', 1),
				glider_data.get('datum_label', ''),
				glider_data.get('wedge', ''),
				glider_data.get('wedge_position', ''),
			)
			if limits_data:
				parsed.limits = Limits(
					limits_data.get('mmwp'),
					limits_data.get('mmwv'),
					limits_data.get('mmenp'),
					limits_data.get('mm_harnais'),
					limits_data.get('weight_min_pilot'),
					limits_data.get('front_centering'),
					limits_data.get('rear_centering'),
				)
			if arms_data:
				parsed.arms = Arms(
					arms_data.get('arm_front_pilot'),
					arms_data.get('arm_rear_pilot'),
					arms_data.get('arm_waterballast'),
					arms_data.get('arm_front_ballast'),
					arms_data.get('arm_rear_watterballast_or_ballast'),
					arms_data.get('arm_gas_tank', 0.0),
					arms_data.get('arm_instruments_panel'),
				)

			parsed.weight_and_balances = [tuple(item) for item in glider_data.get('weight_and_balances', [])]
			parsed.weighings = [
				Weighing(
					item.get('id'),
					_required_date(cls._parse_date(item.get('date')), 'weighing date', registration),
					float(item.get('p1', 0.0)),
					float(item.get('p2', 0.0)),
					float(item.get('right_wing_weight', 0.0)),
					float(item.get('left_wing_weight', 0.0)),
					float(item.get('tail_weight', 0.0)),
					float(item.get('fuselage_weight', 0.0)),
					float(item.get('fix_ballast_weight', 0.0)),
					int(item.get('A', 0)),
					int(item.get('D', 0)),
					registration,
				) for item in glider_data.get('weighings', [])
			]
			parsed.instruments = [
				Instrument(
					item.get('id'),
					bool(item.get('on_board', False)),
					item.get('instrument', ''),
					item.get('brand', ''),
					item.get('type', ''),
					item.get('number', ''),
					item.get('seat', ''),
					cls._parse_date(item.get('date')),
					registration,
				) for item in glider_data.get('instruments', [])
			]
			rows[registration] = parsed

		return rows
	
	def last_weighing(self) -> Optional[Weighing]:
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
		if self.limits is None or self.limits.mmwv is None:
			raise ValueError('Limits or mmwv is not set for this glider')
		
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
		if self.limits is None or self.limits.mmenp is None:
			raise ValueError('Limits or mmenp is not set for this glider')
		
		return round(self.limits.mmenp - last_weighing.mvenp(), 2)
	
	def cu(self) -> float:
		'''
		Retourne la charge utile en kg, défini comme le minimum entre la charge variable max et la charge utile max
		'''
		return min(self.cv_max(), self.cu_max())
	
	def pilot_av_mini(self) -> float:
		if self.limits is None or self.arms is None:
			raise ValueError('Limits or arms are not set for this glider')
		mass_mini_pilot: Optional[float] = None
		if self.pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value:
			mass_mini_pilot = self.empty_weight() * (self.empty_arm() - self.limits.rear_centering) / (self.arms.arm_front_pilot + self.limits.rear_centering)
		elif self.pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM.value:
			if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
				mass_mini_pilot = self.empty_weight() * (self.limits.rear_centering - self.empty_arm()) / (self.limits.rear_centering - self.arms.arm_front_pilot)
			elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
				mass_mini_pilot = self.empty_weight() * (self.empty_arm() - self.limits.rear_centering) / (self.limits.rear_centering - self.arms.arm_front_pilot)
			else:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
		if mass_mini_pilot is None:
			raise ValueError('Failed to calculate mass_mini_pilot')
		return round(mass_mini_pilot, 1)

	def pilot_av_mini_duo(self) -> float:
		if self.limits is None or self.arms is None:
			raise ValueError('Limits or arms are not set for this glider')
		mass_mini_pilot: Optional[float] = None
		if self.pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value:
			return self.pilot_av_mini()
		elif self.pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM.value:
			if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
			elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
				mass_mini_pilot = self.pilot_av_mini() - (self.limits.weight_min_pilot * (self.limits.rear_centering - self.arms.arm_rear_pilot)) / (self.limits.rear_centering - self.arms.arm_front_pilot)
			else:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
		if mass_mini_pilot is None:
			raise ValueError('Failed to calculate mass_mini_pilot')
		return round(mass_mini_pilot, 1)

	def pilot_av_maxi(self) -> float:
		if self.limits is None or self.arms is None:
			raise ValueError('Limits or arms are not set for this glider')
		mass_maxi_pilot: Optional[float] = None
		if self.pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value:
			mass_maxi_pilot = self.empty_weight() * (self.empty_arm() - self.limits.front_centering) / (self.arms.arm_front_pilot + self.limits.front_centering)
		elif self.pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM.value:
			if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
				mass_maxi_pilot = self.empty_weight() * (self.limits.front_centering - self.empty_arm()) / (self.limits.front_centering - self.arms.arm_front_pilot)
			elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
				mass_maxi_pilot = self.empty_weight() * (self.empty_arm() - self.limits.front_centering) / (self.limits.front_centering - self.arms.arm_front_pilot)
			else:
				raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))
		if mass_maxi_pilot is None:
			raise ValueError('Failed to calculate mass_maxi_pilot')
		return round(mass_maxi_pilot, 1)

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
		if self.arms is None:
			raise ValueError('Arms data is missing for this glider')
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
