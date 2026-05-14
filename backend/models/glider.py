"""Glider data models and business logic for PyGliderCG backend"""

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import List, Tuple, Optional


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
		'label': 'Bord d\'attaque de l\'aile - Train principal en avant de la référence',
		'image': 'img/datum-hd-4.png',
	},
	DatumWeighingPoints.DATUM_FORWARD_GLIDER: {
		'label': 'Devant le planeur - 2 point en arrière de la référence',
		'image': 'img/datum-hd-snc34c.png',
	}
}


def get_datum_image_by_label(label):
	"""Get datum image path by label"""
	datum = next(filter(lambda item: item[1]['label'] == label, DATUMS.items()), None)
	return datum[1].get('image') if datum else None


@dataclass
class Limits:
	"""Weight and centering limits for a glider"""
	mmwp: float
	mmwv: float
	mmenp: float
	mm_harnais: float
	weight_min_pilot: float
	front_centering: float
	rear_centering: float


@dataclass
class Arms:
	"""Arm (moment lever) values for calculating center of gravity"""
	arm_front_pilot: float
	arm_rear_pilot: float
	arm_waterballast: float
	arm_front_ballast: float
	arm_rear_watterballast_or_ballast: float
	arm_gas_tank: float
	arm_instruments_panel: float


@dataclass
class Weighing:
	"""Empty weight weighing data for a glider"""
	id: int
	date: date
	p1: float
	p2: float
	right_wing_weight: float
	left_wing_weight: float
	tail_weight: float
	fuselage_weight: float
	fix_ballast_weight: float = 0.0
	A: int = 0
	D: int = 0

	def mve(self) -> float:
		"""Mass à vide équipée (MVE) in kg"""
		return round(self.right_wing_weight + self.left_wing_weight + self.tail_weight + self.fuselage_weight + self.fix_ballast_weight, 2)

	def mvenp(self) -> float:
		"""Mass à vide des éléments non portants (MVENP) in kg"""
		return round(self.tail_weight + self.fuselage_weight + self.fix_ballast_weight, 2)


@dataclass
class Instrument:
	"""Aircraft instrument or equipment inventory item"""
	id: int
	on_board: bool
	instrument: str
	brand: str
	type: str
	number: str
	date: date
	seat: str


@dataclass
class Glider:
	"""Main Glider data model with CG calculation methods"""
	model: str
	registration: str
	brand: str
	serial_number: Optional[int]
	single_seat: bool
	datum: int
	pilot_position: int
	datum_label: str
	wedge: str
	wedge_position: str

	limits: Optional[Limits] = None
	arms: Optional[Arms] = None
	weighings: List[Weighing] = field(default_factory=list)
	weight_and_balances: List[Tuple[int, float]] = field(default_factory=list)
	instruments: List[Instrument] = field(default_factory=list)

	def get_instrument_by_id(self, id: int) -> Optional[Instrument]:
		"""Get instrument by ID"""
		return next((instrument for instrument in self.instruments if instrument.id == id), None)

	def get_weighing_by_id(self, id: int) -> Optional[Weighing]:
		"""Get weighing by ID"""
		return next((weighing for weighing in self.weighings if weighing.id == id), None)

	def last_weighing(self) -> Optional[Weighing]:
		"""Get the most recent weighing"""
		return max(self.weighings, key=lambda x: x.date) if len(self.weighings) > 0 else None

	def empty_weight(self) -> float:
		"""Empty weight (mass à vide équipée) in kg"""
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')
		return last_weighing.mve()

	def cv_max(self) -> float:
		"""Maximum variable load (Charge variable maximum) in kg
		CV max = MMWV - MVE"""
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')
		if self.limits is None or self.limits.mmwv is None:
			raise ValueError('Limits or mmwv is not set for this glider')
		return round(self.limits.mmwv - last_weighing.mve(), 2)

	def cu_max(self) -> float:
		"""Maximum useful load (Charge utile maximum) in kg
		CU max = MMENP - MVENP"""
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')
		if self.limits is None or self.limits.mmenp is None:
			raise ValueError('Limits or mmenp is not set for this glider')
		return round(self.limits.mmenp - last_weighing.mvenp(), 2)

	def cu(self) -> float:
		"""Useful load in kg = min(CV max, CU max)"""
		return min(self.cv_max(), self.cu_max())

	def pilot_av_mini(self) -> float:
		"""Minimum front pilot weight in kg"""
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
		"""Minimum front pilot weight for dual seat configuration in kg"""
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
		"""Maximum front pilot weight in kg"""
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
		"""Empty weight arm (center of gravity arm) in mm"""
		last_weighing = self.last_weighing()
		if last_weighing is None:
			raise ValueError('No weighing for this glider')

		if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
			D1 = last_weighing.D * last_weighing.p2 / (last_weighing.p1 + last_weighing.p2)
			x0 = D1 + last_weighing.A
			return round(x0, 0)
		elif self.datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER.value:
			x0 = last_weighing.D - (last_weighing.p1 * (last_weighing.D - last_weighing.A)) / (last_weighing.p1 + last_weighing.p2)
			return round(x0, 0)
		else:
			raise NotImplementedError('The calculation is not implemented for this type of datum {}'.format(self.datum))

	def weight_and_balance_calculator(self, front_pilot_weight, rear_pilot_weight, front_ballast_weight, rear_ballast_weight, wing_water_ballast_weight):
		"""Calculate total weight and center of gravity for given loading
		Returns tuple of (total_weight_kg, cg_mm)"""
		glider_weight = self.empty_weight() + front_pilot_weight + rear_pilot_weight + front_ballast_weight + rear_ballast_weight + wing_water_ballast_weight
		if self.arms is None:
			raise ValueError('Arms data is missing for this glider')
		if self.datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value:
			moment_arm = (
				self.empty_weight() * self.empty_arm() +
				front_pilot_weight * self.arms.arm_front_pilot * -1 +
				rear_pilot_weight * self.arms.arm_rear_pilot * -1 +
				front_ballast_weight * self.arms.arm_front_ballast * -1 +
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
