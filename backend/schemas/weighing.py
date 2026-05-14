"""Pydantic schemas for weighing and CG calculations"""

from __future__ import annotations
from datetime import date
from typing import Optional, List, Tuple
from pydantic import BaseModel, Field


class WeightEntrySchema(BaseModel):
	"""Schema for a single weight entry"""
	position: str = Field(..., description='Position/name of the weight (e.g., "Front Pilot", "Rear Ballast")')
	mass: float = Field(..., gt=0, description='Mass in kilograms')
	arm: float = Field(..., description='Moment arm in millimeters from datum')


class GliderLimitsSchema(BaseModel):
	"""Schema for glider CG and weight limits"""
	mmwp: float = Field(..., gt=0, description='Max weight with water ballast (kg)')
	mmwv: float = Field(..., gt=0, description='Max weight empty with water ballast (kg)')
	mmenp: float = Field(..., gt=0, description='Max weight non-carrying elements (kg)')
	mm_harnais: float = Field(..., gt=0, description='Max harness weight (kg)')
	weight_min_pilot: float = Field(..., gt=0, description='Minimum pilot weight (kg)')
	front_centering: float = Field(..., description='Front CG limit (mm)')
	rear_centering: float = Field(..., description='Rear CG limit (mm)')


class GliderArmsSchema(BaseModel):
	"""Schema for moment arms of different weight positions"""
	arm_front_pilot: float = Field(..., description='Front pilot arm (mm)')
	arm_rear_pilot: float = Field(..., description='Rear pilot arm (mm)')
	arm_waterballast: float = Field(..., description='Water ballast arm (mm)')
	arm_front_ballast: float = Field(..., description='Front ballast arm (mm)')
	arm_rear_watterballast_or_ballast: float = Field(..., description='Rear ballast arm (mm)')
	arm_gas_tank: Optional[float] = Field(None, description='Gas tank arm (mm)')
	arm_instruments_panel: Optional[float] = Field(None, description='Instruments panel arm (mm)')


class WeighingDataSchema(BaseModel):
	"""Schema for raw weighing measurements"""
	p1: float = Field(..., gt=0, description='Front scale measurement (kg)')
	p2: float = Field(..., gt=0, description='Rear scale measurement (kg)')
	A: int = Field(..., description='Distance from datum to moment arm (mm)')
	D: int = Field(..., gt=0, description='Distance between scales (mm)')
	right_wing_weight: float = Field(..., ge=0, description='Right wing weight (kg)')
	left_wing_weight: float = Field(..., ge=0, description='Left wing weight (kg)')
	tail_weight: float = Field(..., ge=0, description='Tail weight (kg)')
	fuselage_weight: float = Field(..., ge=0, description='Fuselage weight (kg)')
	fix_ballast_weight: float = Field(default=0.0, ge=0, description='Fixed ballast weight (kg)')


class WeighingCalculationRequestSchema(BaseModel):
	"""Schema for CG calculation request"""
	glider_id: str = Field(..., description='Glider registration/ID')
	weighing_data: WeighingDataSchema = Field(..., description='Raw weighing measurements')
	limits: GliderLimitsSchema = Field(..., description='Glider weight and CG limits')
	arms: GliderArmsSchema = Field(..., description='Moment arms for different positions')
	datum: int = Field(..., ge=1, le=4, description='Datum type (1-4)')
	pilot_position: int = Field(..., ge=1, le=2, description='Pilot position type (1-2)')


class CGLimitCheckSchema(BaseModel):
	"""Schema for CG limit check result"""
	cg_position: float = Field(..., description='CG position (mm)')
	front_limit: float = Field(..., description='Front CG limit (mm)')
	rear_limit: float = Field(..., description='Rear CG limit (mm)')
	within_limits: bool = Field(..., description='Whether CG is within limits')
	margin_front: float = Field(..., description='Distance to front limit (mm)')
	margin_rear: float = Field(..., description='Distance to rear limit (mm)')


class PilotWeightLimitsSchema(BaseModel):
	"""Schema for calculated pilot weight limits"""
	min_weight: float = Field(..., description='Minimum pilot weight (kg)')
	max_weight: float = Field(..., description='Maximum pilot weight (kg)')
	min_limit_reason: str = Field(..., description='What constrains the minimum weight')
	max_limit_reason: str = Field(..., description='What constrains the maximum weight')
	min_weight_duo: Optional[float] = Field(None, description='Minimum pilot weight in duo config (kg)')


class WeighingCalculationResponseSchema(BaseModel):
	"""Schema for CG calculation response"""
	glider_id: str = Field(..., description='Glider registration/ID')
	timestamp: str = Field(..., description='Calculation timestamp (ISO 8601)')

	# Empty aircraft values
	mve: float = Field(..., description='Empty equipped weight (kg)')
	mvenp: float = Field(..., description='Empty non-carrying elements weight (kg)')
	empty_arm: float = Field(..., description='Empty aircraft CG position (mm)')

	# Load limits
	cv_max: float = Field(..., description='Maximum variable load (kg)')
	cu_max: float = Field(..., description='Maximum useful load (kg)')
	cu: float = Field(..., description='Actual useful load (kg)')

	# Pilot weight limits
	pilot_limits: PilotWeightLimitsSchema = Field(..., description='Calculated pilot weight limits')

	# CG limits
	cg_check: CGLimitCheckSchema = Field(..., description='CG limit check result')

	# Validation
	within_limits: bool = Field(..., description='Whether configuration is within all limits')
	warnings: List[str] = Field(default_factory=list, description='List of warnings or constraint messages')


class CGLimitResponseSchema(BaseModel):
	"""Schema for glider CG and weight limits response"""
	glider_id: str = Field(..., description='Glider registration')
	min_cg: float = Field(..., description='Minimum CG position (mm)')
	max_cg: float = Field(..., description='Maximum CG position (mm)')
	weight_points: List[Tuple[float, float]] = Field(..., description='Weight and balance envelope points')


class WeighingHistorySchema(BaseModel):
	"""Schema for a single weighing in history"""
	id: int = Field(..., description='Weighing record ID')
	glider_id: str = Field(..., description='Glider registration')
	weighing_date: str = Field(..., description='Weighing date (YYYY-MM-DD)')
	mve: float = Field(..., description='Measured empty equipped weight (kg)')
	mvenp: float = Field(..., description='Measured non-carrying elements weight (kg)')
	empty_arm: float = Field(..., description='Calculated CG position (mm)')
	notes: Optional[str] = Field(None, description='Weighing notes')


class WeightLoadSchema(BaseModel):
	"""Schema for a weight and balance load configuration"""
	front_pilot_weight: float = Field(default=0.0, ge=0, description='Front pilot weight (kg)')
	rear_pilot_weight: float = Field(default=0.0, ge=0, description='Rear pilot weight (kg)')
	front_ballast_weight: float = Field(default=0.0, ge=0, description='Front ballast weight (kg)')
	rear_ballast_weight: float = Field(default=0.0, ge=0, description='Rear ballast weight (kg)')
	wing_water_ballast_weight: float = Field(default=0.0, ge=0, description='Wing water ballast weight (kg)')


class WeightBalanceCalcSchema(BaseModel):
	"""Schema for weight and balance calculation with load"""
	glider_id: str = Field(..., description='Glider registration')
	empty_weight: float = Field(..., gt=0, description='Empty aircraft weight (kg)')
	empty_arm: float = Field(..., description='Empty aircraft CG position (mm)')
	load: WeightLoadSchema = Field(..., description='Load configuration')
	limits: GliderLimitsSchema = Field(..., description='Weight and CG limits')
	arms: GliderArmsSchema = Field(..., description='Moment arms')
	datum: int = Field(..., ge=1, le=4, description='Datum type')


class WeightBalanceResultSchema(BaseModel):
	"""Schema for weight and balance calculation result"""
	total_weight: float = Field(..., description='Total aircraft weight (kg)')
	cg_position: float = Field(..., description='Calculated CG position (mm)')
	within_limits: bool = Field(..., description='Whether CG is within limits')
	margin_front: float = Field(..., description='Distance to front limit (mm)')
	margin_rear: float = Field(..., description='Distance to rear limit (mm)')
	warnings: List[str] = Field(default_factory=list, description='Warning messages')
