"""Weighing calculation service"""

from datetime import datetime
from typing import Optional
import logging

from backend.models.weighing import (
	WeighingCalculator,
	WeighingData,
	GliderLimits,
	GliderArms,
	DatumWeighingPoints,
	DatumPilotPosition,
)
from backend.schemas.weighing import (
	WeighingCalculationResponseSchema,
	WeighingDataSchema,
	GliderLimitsSchema,
	GliderArmsSchema,
	CGLimitCheckSchema,
	PilotWeightLimitsSchema,
	WeightBalanceResultSchema,
	WeightLoadSchema,
)

logger = logging.getLogger(__name__)

# Limit reason strings
LIMIT_REASONS = {
	'flight_manual': 'Flight manual',
	'cg_forward': 'CG forward limit',
	'cg_rear': 'CG rear limit',
	'max_weight': 'Maximum weight',
	'harness': 'Harness weight limit',
	'non_carrying': 'Non-carrying elements',
}


class WeighingCalculationService:
	"""Service for weighing and CG calculations"""

	@staticmethod
	def calculate_weighing(
		glider_id: str,
		weighing_data: WeighingDataSchema,
		limits: GliderLimitsSchema,
		arms: GliderArmsSchema,
		datum: int,
		pilot_position: int,
	) -> WeighingCalculationResponseSchema:
		"""
		Perform complete CG calculation for weighing measurements.
		"""
		try:
			# Convert schemas to internal models
			weighing = WeighingData(
				p1=weighing_data.p1,
				p2=weighing_data.p2,
				A=weighing_data.A,
				D=weighing_data.D,
				right_wing_weight=weighing_data.right_wing_weight,
				left_wing_weight=weighing_data.left_wing_weight,
				tail_weight=weighing_data.tail_weight,
				fuselage_weight=weighing_data.fuselage_weight,
				fix_ballast_weight=weighing_data.fix_ballast_weight,
			)

			limits_model = GliderLimits(
				mmwp=limits.mmwp,
				mmwv=limits.mmwv,
				mmenp=limits.mmenp,
				mm_harnais=limits.mm_harnais,
				weight_min_pilot=limits.weight_min_pilot,
				front_centering=limits.front_centering,
				rear_centering=limits.rear_centering,
			)

			arms_model = GliderArms(
				arm_front_pilot=arms.arm_front_pilot,
				arm_rear_pilot=arms.arm_rear_pilot,
				arm_waterballast=arms.arm_waterballast,
				arm_front_ballast=arms.arm_front_ballast,
				arm_rear_watterballast_or_ballast=arms.arm_rear_watterballast_or_ballast,
				arm_gas_tank=arms.arm_gas_tank,
				arm_instruments_panel=arms.arm_instruments_panel,
			)

			datum_enum = DatumWeighingPoints(datum)
			pilot_position_enum = DatumPilotPosition(pilot_position)

			# Calculate MVE and MVENP
			mve = WeighingCalculator.calculate_mve(weighing)
			mvenp = WeighingCalculator.calculate_mvenp(weighing)

			# Calculate load limits
			cv_max = WeighingCalculator.calculate_cv_max(mve, limits_model)
			cu_max = WeighingCalculator.calculate_cu_max(mvenp, limits_model)
			cu = WeighingCalculator.calculate_cu(cv_max, cu_max)

			# Calculate empty arm (CG position)
			empty_arm = WeighingCalculator.calculate_empty_arm(weighing, datum_enum)

			# Calculate pilot weight limits
			pilot_mini = WeighingCalculator.calculate_pilot_av_mini(
				mve, empty_arm, limits_model, arms_model, pilot_position_enum, datum_enum
			)
			pilot_maxi = WeighingCalculator.calculate_pilot_av_maxi(
				mve, empty_arm, limits_model, arms_model, pilot_position_enum, datum_enum
			)

			# For duo configuration
			pilot_mini_duo = None
			try:
				pilot_mini_duo = WeighingCalculator.calculate_pilot_av_mini_duo(
					pilot_mini, limits_model, arms_model, pilot_position_enum, datum_enum
				)
			except Exception as e:
				logger.warning(f'Could not calculate duo pilot weight: {e}')

			# Determine limiting factors
			min_limit_reason = LIMIT_REASONS['flight_manual']
			max_limit_reason = LIMIT_REASONS['cg_forward']

			# Check CG limits
			within_cg_limits = WeighingCalculator.is_within_cg_limits(
				empty_arm, limits_model
			)
			within_weight_limits = WeighingCalculator.validate_weight_limits(
				mve, limits_model
			)

			# Calculate margins
			margin_front = empty_arm - limits_model.front_centering
			margin_rear = limits_model.rear_centering - empty_arm

			# Build CG check result
			cg_check = CGLimitCheckSchema(
				cg_position=empty_arm,
				front_limit=limits_model.front_centering,
				rear_limit=limits_model.rear_centering,
				within_limits=within_cg_limits,
				margin_front=margin_front,
				margin_rear=margin_rear,
			)

			# Build pilot limits
			pilot_limits = PilotWeightLimitsSchema(
				min_weight=pilot_mini,
				max_weight=pilot_maxi,
				min_limit_reason=min_limit_reason,
				max_limit_reason=max_limit_reason,
				min_weight_duo=pilot_mini_duo,
			)

			# Collect warnings
			warnings = []
			if not within_cg_limits:
				if empty_arm < limits_model.front_centering:
					warnings.append('CG is forward of front limit')
				elif empty_arm > limits_model.rear_centering:
					warnings.append('CG is aft of rear limit')

			if not within_weight_limits:
				warnings.append('Aircraft weight exceeds maximum')

			if margin_front < 10:
				warnings.append(f'Low margin to front CG limit: {margin_front:.1f}mm')
			if margin_rear < 10:
				warnings.append(f'Low margin to rear CG limit: {margin_rear:.1f}mm')

			# Build response
			response = WeighingCalculationResponseSchema(
				glider_id=glider_id,
				timestamp=datetime.utcnow().isoformat() + 'Z',
				mve=mve,
				mvenp=mvenp,
				empty_arm=empty_arm,
				cv_max=cv_max,
				cu_max=cu_max,
				cu=cu,
				pilot_limits=pilot_limits,
				cg_check=cg_check,
				within_limits=within_cg_limits and within_weight_limits,
				warnings=warnings,
			)

			return response

		except Exception as e:
			logger.error(f'Error in weighing calculation: {e}')
			raise

	@staticmethod
	def calculate_weight_balance(
		glider_id: str,
		empty_weight: float,
		empty_arm: float,
		load: WeightLoadSchema,
		limits: GliderLimitsSchema,
		arms: GliderArmsSchema,
		datum: int,
	) -> WeightBalanceResultSchema:
		"""
		Calculate total weight and CG for a given load configuration.
		"""
		try:
			arms_model = GliderArms(
				arm_front_pilot=arms.arm_front_pilot,
				arm_rear_pilot=arms.arm_rear_pilot,
				arm_waterballast=arms.arm_waterballast,
				arm_front_ballast=arms.arm_front_ballast,
				arm_rear_watterballast_or_ballast=arms.arm_rear_watterballast_or_ballast,
				arm_gas_tank=arms.arm_gas_tank,
				arm_instruments_panel=arms.arm_instruments_panel,
			)

			limits_model = GliderLimits(
				mmwp=limits.mmwp,
				mmwv=limits.mmwv,
				mmenp=limits.mmenp,
				mm_harnais=limits.mm_harnais,
				weight_min_pilot=limits.weight_min_pilot,
				front_centering=limits.front_centering,
				rear_centering=limits.rear_centering,
			)

			datum_enum = DatumWeighingPoints(datum)

			# Calculate total weight and CG
			total_weight, cg_position = WeighingCalculator.calculate_weight_and_balance(
				empty_weight=empty_weight,
				empty_arm=empty_arm,
				front_pilot_weight=load.front_pilot_weight,
				rear_pilot_weight=load.rear_pilot_weight,
				front_ballast_weight=load.front_ballast_weight,
				rear_ballast_weight=load.rear_ballast_weight,
				wing_water_ballast_weight=load.wing_water_ballast_weight,
				arms=arms_model,
				datum=datum_enum,
			)

			# Check limits
			within_limits = WeighingCalculator.is_within_cg_limits(
				cg_position, limits_model
			)
			weight_valid = WeighingCalculator.validate_weight_limits(
				total_weight, limits_model
			)

			# Calculate margins
			margin_front = cg_position - limits_model.front_centering
			margin_rear = limits_model.rear_centering - cg_position

			warnings = []
			if not within_limits:
				if cg_position < limits_model.front_centering:
					warnings.append('CG is forward of front limit')
				else:
					warnings.append('CG is aft of rear limit')

			if not weight_valid:
				warnings.append('Aircraft weight exceeds maximum')

			return WeightBalanceResultSchema(
				total_weight=total_weight,
				cg_position=cg_position,
				within_limits=within_limits and weight_valid,
				margin_front=margin_front,
				margin_rear=margin_rear,
				warnings=warnings,
			)

		except Exception as e:
			logger.error(f'Error in weight balance calculation: {e}')
			raise
