"""Weighing and CG calculation models for PyGliderCG backend"""

from dataclasses import dataclass
from typing import Optional
from enum import Enum


class DatumWeighingPoints(Enum):
	"""Enum for weighing datum reference points"""
	DATUM_WING_2POINTS_AFT_OF_DATUM = 1
	DATUM_WING_1POINT_AFT_OF_DATUM = 2
	DATUM_WING_WHEEL_FORWARD_OF_DATUM = 3
	DATUM_FORWARD_GLIDER = 4


class DatumPilotPosition(Enum):
	"""Enum for pilot position relative to datum"""
	PILOT_FORWARD_OF_DATUM = 1
	PILOT_AFT_OF_DATUM = 2


@dataclass
class WeightEntry:
	"""Represents a weight entry with position and mass"""
	position: str
	mass: float
	arm: float


@dataclass
class GliderLimits:
	"""CG and weight limits for a glider"""
	mmwp: float  # Max weight with water ballast
	mmwv: float  # Max weight empty with water ballast
	mmenp: float  # Max weight non-carrying elements
	mm_harnais: float  # Max harness weight
	weight_min_pilot: float  # Minimum pilot weight
	front_centering: float  # Front CG limit (mm)
	rear_centering: float  # Rear CG limit (mm)


@dataclass
class GliderArms:
	"""Moment arms for different weight positions"""
	arm_front_pilot: float
	arm_rear_pilot: float
	arm_waterballast: float
	arm_front_ballast: float
	arm_rear_watterballast_or_ballast: float
	arm_gas_tank: Optional[float] = None
	arm_instruments_panel: Optional[float] = None


@dataclass
class WeighingData:
	"""Raw weighing measurements"""
	p1: float  # Front scale measurement (kg)
	p2: float  # Rear scale measurement (kg)
	A: int  # Distance from datum to moment arm (mm)
	D: int  # Distance between scales (mm)
	right_wing_weight: float
	left_wing_weight: float
	tail_weight: float
	fuselage_weight: float
	fix_ballast_weight: float = 0.0


class WeighingCalculator:
	"""Core calculation engine for glider weight and balance"""

	@staticmethod
	def calculate_mve(weighing: WeighingData) -> float:
		"""Calculate MVE (empty equipped weight) in kg"""
		mve = (
			weighing.right_wing_weight
			+ weighing.left_wing_weight
			+ weighing.tail_weight
			+ weighing.fuselage_weight
			+ weighing.fix_ballast_weight
		)
		return round(mve, 2)

	@staticmethod
	def calculate_mvenp(weighing: WeighingData) -> float:
		"""Calculate MVENP (non-carrying elements weight) in kg"""
		mvenp = weighing.tail_weight + weighing.fuselage_weight + weighing.fix_ballast_weight
		return round(mvenp, 2)

	@staticmethod
	def calculate_cv_max(
		empty_weight: float, limits: GliderLimits
	) -> float:
		"""
		Calculate maximum variable load (CV max) in kg
		CV max = MMWV - MVE
		"""
		if limits.mmwv is None:
			raise ValueError('MMWV limit is not set')
		cv_max = limits.mmwv - empty_weight
		return round(cv_max, 2)

	@staticmethod
	def calculate_cu_max(mvenp: float, limits: GliderLimits) -> float:
		"""
		Calculate maximum useful load (CU max) in kg
		CU max = MMENP - MVENP
		"""
		if limits.mmenp is None:
			raise ValueError('MMENP limit is not set')
		cu_max = limits.mmenp - mvenp
		return round(cu_max, 2)

	@staticmethod
	def calculate_cu(cv_max: float, cu_max: float) -> float:
		"""Calculate useful load as minimum of cv_max and cu_max"""
		return round(min(cv_max, cu_max), 2)

	@staticmethod
	def calculate_empty_arm(
		weighing: WeighingData, datum: DatumWeighingPoints
	) -> float:
		"""
		Calculate X0 (empty aircraft CG position from datum) in mm
		"""
		if datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM:
			# X0 = D1 + A, where D1 = M2 * D / (M1 + M2)
			total_weight = weighing.p1 + weighing.p2
			if total_weight == 0:
				raise ValueError('Total weight (p1 + p2) cannot be zero')
			D1 = weighing.D * weighing.p2 / total_weight
			x0 = D1 + weighing.A
			return round(x0, 0)
		elif datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER:
			# X0 = D - (p1 * (D - A)) / (p1 + p2)
			total_weight = weighing.p1 + weighing.p2
			if total_weight == 0:
				raise ValueError('Total weight (p1 + p2) cannot be zero')
			x0 = weighing.D - (weighing.p1 * (weighing.D - weighing.A)) / total_weight
			return round(x0, 0)
		else:
			raise NotImplementedError(
				f'Calculation not implemented for datum type {datum}'
			)

	@staticmethod
	def calculate_pilot_av_mini(
		empty_weight: float,
		empty_arm: float,
		limits: GliderLimits,
		arms: GliderArms,
		pilot_position: DatumPilotPosition,
		datum: DatumWeighingPoints,
	) -> float:
		"""Calculate minimum front pilot weight in kg"""
		mass_mini_pilot: Optional[float] = None

		if pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM:
			denominator = arms.arm_front_pilot + limits.rear_centering
			if denominator == 0:
				raise ValueError('Denominator is zero: arm_front_pilot + rear_centering cannot be zero')
			mass_mini_pilot = (
				empty_weight
				* (empty_arm - limits.rear_centering)
				/ denominator
			)
		elif pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM:
			if datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM:
				denominator = limits.rear_centering - arms.arm_front_pilot
				if denominator == 0:
					raise ValueError('Denominator is zero: rear_centering - arm_front_pilot cannot be zero')
				mass_mini_pilot = (
					empty_weight
					* (limits.rear_centering - empty_arm)
					/ denominator
				)
			elif datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER:
				denominator = limits.rear_centering - arms.arm_front_pilot
				if denominator == 0:
					raise ValueError('Denominator is zero: rear_centering - arm_front_pilot cannot be zero')
				mass_mini_pilot = (
					empty_weight
					* (empty_arm - limits.rear_centering)
					/ denominator
				)
			else:
				raise NotImplementedError(
					f'Calculation not implemented for datum type {datum}'
				)
		else:
			raise ValueError(f'Unknown pilot position: {pilot_position}')

		if mass_mini_pilot is None:
			raise ValueError('Failed to calculate minimum pilot weight')
		return round(mass_mini_pilot, 1)

	@staticmethod
	def calculate_pilot_av_mini_duo(
		pilot_mini: float,
		limits: GliderLimits,
		arms: GliderArms,
		pilot_position: DatumPilotPosition,
		datum: DatumWeighingPoints,
	) -> float:
		"""Calculate minimum front pilot weight in duo configuration"""
		if pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM:
			return pilot_mini

		if pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM:
			if datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM:
				raise NotImplementedError(
					f'Calculation not implemented for datum type {datum} in duo'
				)
			elif datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER:
				mass_mini_pilot_duo = (
					pilot_mini
					- (
						limits.weight_min_pilot
						* (limits.rear_centering - arms.arm_rear_pilot)
					)
					/ (limits.rear_centering - arms.arm_front_pilot)
				)
				return round(mass_mini_pilot_duo, 1)
			else:
				raise NotImplementedError(
					f'Calculation not implemented for datum type {datum}'
				)

		raise ValueError(f'Unknown pilot position: {pilot_position}')

	@staticmethod
	def calculate_pilot_av_maxi(
		empty_weight: float,
		empty_arm: float,
		limits: GliderLimits,
		arms: GliderArms,
		pilot_position: DatumPilotPosition,
		datum: DatumWeighingPoints,
	) -> float:
		"""Calculate maximum front pilot weight in kg"""
		mass_maxi_pilot: Optional[float] = None

		if pilot_position == DatumPilotPosition.PILOT_FORWARD_OF_DATUM:
			denominator = arms.arm_front_pilot + limits.front_centering
			if denominator == 0:
				raise ValueError('Denominator is zero: arm_front_pilot + front_centering cannot be zero')
			mass_maxi_pilot = (
				empty_weight
				* (empty_arm - limits.front_centering)
				/ denominator
			)
		elif pilot_position == DatumPilotPosition.PILOT_AFT_OF_DATUM:
			if datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM:
				denominator = limits.front_centering - arms.arm_front_pilot
				if denominator == 0:
					raise ValueError('Denominator is zero: front_centering - arm_front_pilot cannot be zero')
				mass_maxi_pilot = (
					empty_weight
					* (limits.front_centering - empty_arm)
					/ denominator
				)
			elif datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER:
				denominator = limits.front_centering - arms.arm_front_pilot
				if denominator == 0:
					raise ValueError('Denominator is zero: front_centering - arm_front_pilot cannot be zero')
				mass_maxi_pilot = (
					empty_weight
					* (empty_arm - limits.front_centering)
					/ denominator
				)
			else:
				raise NotImplementedError(
					f'Calculation not implemented for datum type {datum}'
				)
		else:
			raise ValueError(f'Unknown pilot position: {pilot_position}')

		if mass_maxi_pilot is None:
			raise ValueError('Failed to calculate maximum pilot weight')
		return round(mass_maxi_pilot, 1)

	@staticmethod
	def calculate_weight_and_balance(
		empty_weight: float,
		empty_arm: float,
		front_pilot_weight: float,
		rear_pilot_weight: float,
		front_ballast_weight: float,
		rear_ballast_weight: float,
		wing_water_ballast_weight: float,
		arms: GliderArms,
		datum: DatumWeighingPoints,
	) -> tuple[float, float]:
		"""
		Calculate total weight and CG position for a given load configuration.
		Returns: (total_weight_kg, cg_position_mm)
		"""
		total_weight = (
			empty_weight
			+ front_pilot_weight
			+ rear_pilot_weight
			+ front_ballast_weight
			+ rear_ballast_weight
			+ wing_water_ballast_weight
		)

		if total_weight == 0:
			raise ValueError('Total weight cannot be zero')

		if datum == DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM:
			moment_arm = (
				empty_weight * empty_arm
				+ front_pilot_weight * arms.arm_front_pilot * -1
				+ rear_pilot_weight * arms.arm_rear_pilot * -1
				+ front_ballast_weight * arms.arm_front_ballast * -1
				+ rear_ballast_weight * arms.arm_rear_watterballast_or_ballast
				+ wing_water_ballast_weight * arms.arm_waterballast
			)
			cg_position = moment_arm / total_weight
			return round(total_weight, 2), round(cg_position, 1)

		elif datum == DatumWeighingPoints.DATUM_FORWARD_GLIDER:
			moment_arm = (
				empty_weight * empty_arm
				+ front_pilot_weight * arms.arm_front_pilot
				+ rear_pilot_weight * arms.arm_rear_pilot
				+ front_ballast_weight * arms.arm_front_ballast
				+ rear_ballast_weight * arms.arm_rear_watterballast_or_ballast
				+ wing_water_ballast_weight * arms.arm_waterballast
			)
			cg_position = moment_arm / total_weight
			return round(total_weight, 2), round(cg_position, 1)

		else:
			raise NotImplementedError(
				f'Calculation not implemented for datum type {datum}'
			)

	@staticmethod
	def is_within_cg_limits(
		cg_position: float, limits: GliderLimits
	) -> bool:
		"""Check if CG position is within front and rear centering limits"""
		return limits.front_centering <= cg_position <= limits.rear_centering

	@staticmethod
	def validate_weight_limits(
		total_weight: float, limits: GliderLimits
	) -> bool:
		"""Validate that total weight is within maximum limits"""
		return total_weight <= limits.mmwp
