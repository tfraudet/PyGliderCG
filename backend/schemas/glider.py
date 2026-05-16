"""Pydantic schemas for Glider API endpoints"""

from datetime import date as DateType
from typing import List, Tuple, Optional

from pydantic import BaseModel, Field

from backend.models.glider import DatumWeighingPoints, DatumPilotPosition


class LimitsSchema(BaseModel):
	"""Weight and centering limits schema"""
	mmwp: float = Field(..., description='Maximum weight with pilot')
	mmwv: float = Field(..., description='Maximum weight with variable load')
	mmenp: float = Field(..., description='Maximum weight non-supporting elements')
	mm_harnais: float = Field(..., description='Maximum harness weight')
	weight_min_pilot: float = Field(..., description='Minimum pilot weight')
	front_centering: float = Field(..., description='Front centering limit')
	rear_centering: float = Field(..., description='Rear centering limit')

	class Config:
		from_attributes = True


class ArmsSchema(BaseModel):
	"""Arm (moment lever) values schema"""
	arm_front_pilot: float = Field(..., description='Front pilot arm')
	arm_rear_pilot: float = Field(..., description='Rear pilot arm')
	arm_waterballast: float = Field(..., description='Water ballast arm')
	arm_front_ballast: float = Field(..., description='Front ballast arm')
	arm_rear_watterballast_or_ballast: float = Field(..., description='Rear water ballast or ballast arm')
	arm_gas_tank: Optional[float] = Field(0.0, description='Gas tank arm')
	arm_instruments_panel: float = Field(..., description='Instruments panel arm')

	class Config:
		from_attributes = True


class WeighingSchema(BaseModel):
	"""Weighing data schema"""
	id: int
	date: DateType
	p1: float = Field(..., description='Front scale reading (kg)')
	p2: float = Field(..., description='Rear scale reading (kg)')
	right_wing_weight: float
	left_wing_weight: float
	tail_weight: float
	fuselage_weight: float
	fix_ballast_weight: float = 0.0
	A: int = 0
	D: int = 0

	class Config:
		from_attributes = True


class InstrumentSchema(BaseModel):
	"""Aircraft instrument schema"""
	id: int
	on_board: bool
	instrument: str
	brand: str
	type: str
	number: str
	date: Optional[DateType] = None
	seat: str

	class Config:
		from_attributes = True


class InstrumentRequest(BaseModel):
	id: Optional[int] = None
	on_board: bool = False
	instrument: str = ''
	brand: str = ''
	type: str = ''
	number: str = ''
	date: Optional[str] = None
	seat: str = ''


class InstrumentResponse(InstrumentRequest):
	id: Optional[int] = None


class WeighingRequest(BaseModel):
	date: str
	p1: float = 0.0
	p2: float = 0.0
	A: int = 0
	D: int = 0
	right_wing_weight: float = 0.0
	left_wing_weight: float = 0.0
	tail_weight: float = 0.0
	fuselage_weight: float = 0.0
	fix_ballast_weight: float = 0.0


class WeighingResponse(WeighingRequest):
	id: int


class GliderRequest(BaseModel):
	"""Schema for creating/updating gliders"""
	model: str
	registration: str
	brand: str
	serial_number: Optional[int] = None
	single_seat: bool
	datum: int
	pilot_position: int
	datum_label: str
	wedge: str
	wedge_position: str
	limits: Optional[LimitsSchema] = None
	arms: Optional[ArmsSchema] = None


class GliderResponse(BaseModel):
	"""Complete glider response schema"""
	model: str
	registration: str
	brand: str
	serial_number: Optional[int] = None
	single_seat: bool
	datum: int
	pilot_position: int
	datum_label: str
	wedge: str
	wedge_position: str
	limits: Optional[LimitsSchema] = None
	arms: Optional[ArmsSchema] = None
	weighings: List[WeighingSchema] = []
	weight_and_balances: List[Tuple[int, float]] = []
	instruments: List[InstrumentSchema] = []

	class Config:
		from_attributes = True


class WeightAndBalancesRequest(BaseModel):
	"""Request for updating weight and balance limit points"""
	weight_and_balances: List[Tuple[int, float]] = []


class GliderCalculationsResponse(BaseModel):
	"""Response containing glider calculations/performance data"""
	registration: str
	model: str
	empty_weight: Optional[float] = None
	cv_max: Optional[float] = None
	cu_max: Optional[float] = None
	cu: Optional[float] = None
	pilot_av_mini: Optional[float] = None
	pilot_av_mini_duo: Optional[float] = None
	pilot_av_maxi: Optional[float] = None
	empty_arm: Optional[float] = None


class WeightBalanceCalculationRequest(BaseModel):
	"""Request for weight and balance calculation"""
	front_pilot_weight: float = Field(..., ge=0)
	rear_pilot_weight: float = Field(..., ge=0)
	front_ballast_weight: float = Field(..., ge=0)
	rear_ballast_weight: float = Field(..., ge=0)
	wing_water_ballast_weight: float = Field(..., ge=0)


class WeightBalanceCalculationResponse(BaseModel):
	"""Response from weight and balance calculation"""
	total_weight: float
	center_of_gravity: float
