"""FastAPI routes for Glider CRUD operations and CG calculations"""

import logging
from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query

from backend.middleware.auth import require_admin_role
from backend.schemas.glider import (
	GliderResponse,
	GliderRequest,
	GliderCalculationsResponse,
	WeightBalanceCalculationRequest,
	WeightBalanceCalculationResponse,
	WeightAndBalancesRequest,
	LimitsSchema,
	ArmsSchema,
	InstrumentRequest,
	InstrumentSchema,
	WeighingRequest,
	WeighingSchema,
)
from backend.db.glider_queries import (
	get_all_gliders,
	get_glider_by_id,
	create_glider,
	update_glider,
	delete_glider,
	save_instruments,
	save_weighings,
	save_weight_and_balance,
	delete_instrument,
	delete_weighing,
	_get_database_connection,
)
from backend.db.audit_queries import AuditQueries
from backend.models.glider import Glider, Limits, Arms, Instrument, Weighing

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/gliders', tags=['gliders'])
audit_queries = AuditQueries()


def _parse_request_date(value: str, field_name: str) -> date:
	"""Parse request date supporting ISO and day-first formats."""
	raw = value.strip()
	if not raw:
		raise ValueError(f'{field_name} is required')

	try:
		return datetime.fromisoformat(raw).date()
	except ValueError:
		pass

	for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%Y/%m/%d'):
		try:
			return datetime.strptime(raw, fmt).date()
		except ValueError:
			continue

	raise ValueError(
		f'Invalid {field_name} format: "{value}". Expected YYYY-MM-DD or DD/MM/YYYY.'
	)


def _convert_glider_to_response(glider: Glider) -> GliderResponse:
	"""Convert Glider model to GliderResponse schema"""
	limits_schema = None
	if glider.limits:
		limits_schema = LimitsSchema(
			mmwp=glider.limits.mmwp,
			mmwv=glider.limits.mmwv,
			mmenp=glider.limits.mmenp,
			mm_harnais=glider.limits.mm_harnais,
			weight_min_pilot=glider.limits.weight_min_pilot,
			front_centering=glider.limits.front_centering,
			rear_centering=glider.limits.rear_centering,
		)

	arms_schema = None
	if glider.arms:
		arms_schema = ArmsSchema(
			arm_front_pilot=glider.arms.arm_front_pilot,
			arm_rear_pilot=glider.arms.arm_rear_pilot,
			arm_waterballast=glider.arms.arm_waterballast,
			arm_front_ballast=glider.arms.arm_front_ballast,
			arm_rear_watterballast_or_ballast=glider.arms.arm_rear_watterballast_or_ballast,
			arm_gas_tank=glider.arms.arm_gas_tank,
			arm_instruments_panel=glider.arms.arm_instruments_panel,
		)

	# Convert empty serial_number strings to None for integer field
	serial_number = glider.serial_number
	if isinstance(serial_number, str) and serial_number.strip() == '':
		serial_number = None

	def _required_id(value: int | None, kind: str) -> int:
		if value is None:
			raise ValueError(f'Missing {kind} id for glider {glider.registration}')
		return value

	weighings_schema = [
		WeighingSchema(
			id=_required_id(w.id, 'weighing'),
			date=w.date,
			p1=w.p1,
			p2=w.p2,
			right_wing_weight=w.right_wing_weight,
			left_wing_weight=w.left_wing_weight,
			tail_weight=w.tail_weight,
			fuselage_weight=w.fuselage_weight,
			fix_ballast_weight=w.fix_ballast_weight,
			A=w.A,
			D=w.D,
		)
		for w in glider.weighings
	]
	instruments_schema = [
		InstrumentSchema(
			id=_required_id(i.id, 'instrument'),
			on_board=i.on_board,
			instrument=i.instrument,
			brand=i.brand,
			type=i.type,
			number=i.number,
			date=i.date,
			seat=i.seat,
		)
		for i in glider.instruments
	]

	return GliderResponse(
		model=glider.model,
		registration=glider.registration,
		brand=glider.brand,
		serial_number=serial_number,
		single_seat=glider.single_seat,
		datum=glider.datum,
		pilot_position=glider.pilot_position,
		datum_label=glider.datum_label,
		wedge=glider.wedge,
		wedge_position=glider.wedge_position,
		limits=limits_schema,
		arms=arms_schema,
		weighings=weighings_schema,
		weight_and_balances=glider.weight_and_balances,
		instruments=instruments_schema,
	)


def _convert_request_to_glider(registration: str, request: GliderRequest) -> Glider:
	"""Convert GliderRequest schema to Glider model"""
	limits = None
	if request.limits:
		limits = Limits(
			mmwp=request.limits.mmwp,
			mmwv=request.limits.mmwv,
			mmenp=request.limits.mmenp,
			mm_harnais=request.limits.mm_harnais,
			weight_min_pilot=request.limits.weight_min_pilot,
			front_centering=request.limits.front_centering,
			rear_centering=request.limits.rear_centering,
		)

	arms = None
	if request.arms:
		arms = Arms(
			arm_front_pilot=request.arms.arm_front_pilot,
			arm_rear_pilot=request.arms.arm_rear_pilot,
			arm_waterballast=request.arms.arm_waterballast,
			arm_front_ballast=request.arms.arm_front_ballast,
			arm_rear_watterballast_or_ballast=request.arms.arm_rear_watterballast_or_ballast,
			arm_gas_tank=0.0 if request.arms.arm_gas_tank is None else request.arms.arm_gas_tank,
			arm_instruments_panel=request.arms.arm_instruments_panel,
		)

	return Glider(
		model=request.model,
		registration=registration,
		brand=request.brand,
		serial_number=request.serial_number,
		single_seat=request.single_seat,
		datum=request.datum,
		pilot_position=request.pilot_position,
		datum_label=request.datum_label,
		wedge=request.wedge,
		wedge_position=request.wedge_position,
		limits=limits,
		arms=arms,
	)


@router.get('', response_model=List[GliderResponse])
async def list_gliders(
	skip: int = Query(0, ge=0, description='Number of gliders to skip'),
	limit: int = Query(100, ge=1, le=1000, description='Maximum number of gliders to return')
):
	"""
	List all gliders with pagination (public endpoint).

	- **skip**: Number of gliders to skip (default: 0)
	- **limit**: Maximum number of gliders to return (default: 100, max: 1000)
	- **Returns**: List of GliderResponse objects
	"""
	try:
		logger.info(f'Fetching gliders list (skip={skip}, limit={limit})')

		gliders_dict = get_all_gliders()
		gliders_list = list(gliders_dict.values())

		paginated = gliders_list[skip:skip + limit]

		return [_convert_glider_to_response(g) for g in paginated]
	except Exception as e:
		logger.error(f'Error fetching gliders: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to fetch gliders'
		)


@router.get('/{glider_id}', response_model=GliderResponse)
async def get_glider(glider_id: str):
	"""
	Get a single glider by registration/ID (public endpoint).

	- **glider_id**: Registration number of the glider
	- **Returns**: GliderResponse object or 404 if not found
	"""
	try:
		logger.info(f'Fetching glider {glider_id}')

		glider = get_glider_by_id(glider_id)
		if not glider:
			logger.warning(f'Glider {glider_id} not found')
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f'Glider {glider_id} not found'
			)

		return _convert_glider_to_response(glider)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error fetching glider {glider_id}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to fetch glider'
		)


@router.post('', response_model=GliderResponse, status_code=status.HTTP_201_CREATED)
async def create_new_glider(
	request: GliderRequest,
	admin_user = Depends(require_admin_role)
):
	"""
	Create a new glider (admin only).

	- **request**: GliderRequest body with glider details
	- **Returns**: Created GliderResponse object with 201 status
	- **Auth**: Requires admin role
	"""
	try:
		logger.info(f'Admin user {admin_user.username} creating new glider {request.registration}')

		glider_exists = get_glider_by_id(request.registration)
		if glider_exists:
			logger.warning(f'Glider {request.registration} already exists')
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=f'Glider with registration {request.registration} already exists'
			)

		glider = _convert_request_to_glider(request.registration, request)
		create_glider(glider)

		created_glider = get_glider_by_id(request.registration)
		if not created_glider:
			raise ValueError('Failed to retrieve created glider')

		event = f'Glider {request.registration} created'
		if audit_queries.create_audit_entry(user_id=admin_user.username, event=event) is None:
			logger.warning(f'Failed to create glider audit event for {request.registration}')

		logger.info(f'Glider {request.registration} created successfully')
		return _convert_glider_to_response(created_glider)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error creating glider: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to create glider'
		)


@router.put('/{glider_id}', response_model=GliderResponse)
async def update_glider_endpoint(
	glider_id: str,
	request: GliderRequest,
	admin_user = Depends(require_admin_role)
):
	"""
	Update an existing glider (admin only).

	- **glider_id**: Registration number of the glider to update
	- **request**: GliderRequest body with updated glider details
	- **Returns**: Updated GliderResponse object
	- **Auth**: Requires admin role
	"""
	try:
		logger.info(f'Admin user {admin_user.username} updating glider {glider_id}')

		glider_exists = get_glider_by_id(glider_id)
		if not glider_exists:
			logger.warning(f'Glider {glider_id} not found for update')
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f'Glider {glider_id} not found'
			)

		glider = _convert_request_to_glider(glider_id, request)
		update_glider(glider)

		updated_glider = get_glider_by_id(glider_id)
		if not updated_glider:
			raise ValueError('Failed to retrieve updated glider')

		event = f'Glider {glider_id} updated'
		if audit_queries.create_audit_entry(user_id=admin_user.username, event=event) is None:
			logger.warning(f'Failed to create glider audit event for {glider_id}')

		logger.info(f'Glider {glider_id} updated successfully')
		return _convert_glider_to_response(updated_glider)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error updating glider {glider_id}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to update glider'
		)


@router.delete('/{glider_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_glider_endpoint(
	glider_id: str,
	admin_user = Depends(require_admin_role)
):
	"""
	Delete a glider and all its associated data (admin only).

	- **glider_id**: Registration number of the glider to delete
	- **Returns**: 204 No Content on success
	- **Auth**: Requires admin role
	"""
	try:
		logger.info(f'Admin user {admin_user.username} deleting glider {glider_id}')

		glider_exists = get_glider_by_id(glider_id)
		if not glider_exists:
			logger.warning(f'Glider {glider_id} not found for deletion')
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f'Glider {glider_id} not found'
			)

		delete_glider(glider_id)

		event = f'Glider {glider_id} deleted'
		if audit_queries.create_audit_entry(user_id=admin_user.username, event=event) is None:
			logger.warning(f'Failed to create glider audit event for {glider_id}')

		logger.info(f'Glider {glider_id} deleted successfully')
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error deleting glider {glider_id}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to delete glider'
		)


@router.put('/{glider_id}/instruments', status_code=status.HTTP_200_OK)
async def update_glider_instruments(
	glider_id: str,
	instruments: List[InstrumentRequest],
	admin_user = Depends(require_admin_role)
):
	"""Replace all instruments for a glider (admin only)."""
	try:
		glider = get_glider_by_id(glider_id)
		if not glider:
			raise HTTPException(status_code=404, detail=f'Glider {glider_id} not found')

		conn = _get_database_connection()
		conn.execute(f"DELETE FROM INVENTORY WHERE registration='{glider_id}'")
		conn.close()

		instrument_objects = []
		for inst in instruments:
			parsed_date = None
			if isinstance(inst.date, str) and inst.date:
				try:
					parsed_date = _parse_request_date(inst.date, 'instrument date')
				except ValueError as e:
					raise HTTPException(status_code=400, detail=str(e))
			elif isinstance(inst.date, date):
				parsed_date = inst.date

			instrument_objects.append(
				Instrument(
					id=inst.id,
					on_board=inst.on_board,
					instrument=inst.instrument,
					brand=inst.brand,
					type=inst.type,
					number=inst.number,
					date=parsed_date,
					seat=inst.seat,
				)
			)
		

		if instrument_objects:
			if not save_instruments(glider_id, instrument_objects):
				raise ValueError('Failed to save instruments')

		event = f'Instruments {instrument_objects} updated for glider {glider_id}'
		if audit_queries.create_audit_entry(user_id=admin_user.username, event=event) is None:
			logger.warning(f'Failed to create instrument audit event for {glider_id}')

		return {'registration': glider_id, 'instruments_count': len(instrument_objects)}
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error updating instruments for {glider_id}: {e}', exc_info=True)
		raise HTTPException(status_code=500, detail='Failed to update instruments')


@router.delete('/{glider_id}/instruments/{instrument_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_glider_instrument(
	glider_id: str,
	instrument_id: int,
	admin_user = Depends(require_admin_role),
):
	"""Delete one instrument for a glider (admin only)."""
	try:
		glider = get_glider_by_id(glider_id)
		if not glider:
			raise HTTPException(status_code=404, detail=f'Glider {glider_id} not found')

		if not delete_instrument(glider_id, instrument_id):
			raise HTTPException(status_code=404, detail=f'Instrument {instrument_id} not found')

		event = f'Instrument {instrument_id} deleted for gldier {glider_id}'
		if audit_queries.create_audit_entry(user_id=admin_user.username, event=event) is None:
			logger.warning(f'Failed to create instrument deletion audit event for {glider_id}/{instrument_id}')
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error deleting instrument {instrument_id} for {glider_id}: {e}', exc_info=True)
		raise HTTPException(status_code=500, detail='Failed to delete instrument')


@router.post('/{glider_id}/weighings', status_code=status.HTTP_201_CREATED)
async def add_weighings(
	glider_id: str,
	weighings: List[WeighingRequest],
	admin_user = Depends(require_admin_role)
):
	"""Add new weighings for a glider (admin only)."""
	try:
		glider = get_glider_by_id(glider_id)
		if not glider:
			raise HTTPException(status_code=404, detail=f'Glider {glider_id} not found')

		weighing_objects = []
		for w in weighings:
			try:
				parsed_date = _parse_request_date(w.date, 'weighing date') if isinstance(w.date, str) else w.date
			except ValueError as e:
				raise HTTPException(status_code=400, detail=str(e))

			weighing_objects.append(Weighing(
				id=None,
				date=parsed_date,
				p1=w.p1,
				p2=w.p2,
				right_wing_weight=w.right_wing_weight,
				left_wing_weight=w.left_wing_weight,
				tail_weight=w.tail_weight,
				fuselage_weight=w.fuselage_weight,
				fix_ballast_weight=w.fix_ballast_weight,
				A=w.A,
				D=w.D,
			))

		save_weighings(glider_id, weighing_objects)

		event = f'Weighings {weighing_objects} updated for glider {glider_id}'
		if audit_queries.create_audit_entry(user_id=admin_user.username, event=event) is None:
			logger.warning(f'Failed to create weighing audit event for {glider_id}')

		return {'registration': glider_id, 'weighings_added': len(weighing_objects)}
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error adding weighings for {glider_id}: {e}', exc_info=True)
		raise HTTPException(status_code=500, detail='Failed to add weighings')


@router.delete('/{glider_id}/weighings/{weighing_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_glider_weighing(
	glider_id: str,
	weighing_id: int,
	_admin_user = Depends(require_admin_role),
):
	"""Delete one weighing for a glider (admin only)."""
	try:
		_ = _admin_user
		glider = get_glider_by_id(glider_id)
		if not glider:
			raise HTTPException(status_code=404, detail=f'Glider {glider_id} not found')

		if not delete_weighing(glider_id, weighing_id):
			raise HTTPException(status_code=404, detail=f'Weighing {weighing_id} not found')
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error deleting weighing {weighing_id} for {glider_id}: {e}', exc_info=True)
		raise HTTPException(status_code=500, detail='Failed to delete weighing')


@router.put('/{glider_id}/weight-and-balances', status_code=status.HTTP_200_OK)
async def update_weight_and_balances(
	glider_id: str,
	payload: WeightAndBalancesRequest,
	admin_user = Depends(require_admin_role)
):
	"""Replace all weight & balance limit points for a glider (admin only)."""
	try:
		glider = get_glider_by_id(glider_id)
		if not glider:
			raise HTTPException(status_code=404, detail=f'Glider {glider_id} not found')

		if not save_weight_and_balance(glider_id, payload.weight_and_balances):
			raise ValueError('Failed to save weight and balances')

		event = f'Weight & balance {payload.weight_and_balances} for glidder {glider_id} updated'
		if audit_queries.create_audit_entry(user_id=admin_user.username, event=event) is None:
			logger.warning(f'Failed to create weight and balance audit event for {glider_id}')

		return {'registration': glider_id, 'points_count': len(payload.weight_and_balances)}
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error updating weight and balances for {glider_id}: {e}', exc_info=True)
		raise HTTPException(status_code=500, detail='Failed to update weight and balances')


@router.get('/{glider_id}/limits', response_model=GliderCalculationsResponse)
async def get_glider_limits(glider_id: str):
	"""
	Get CG limits and calculation data for a glider (public endpoint).

	- **glider_id**: Registration number of the glider
	- **Returns**: GliderCalculationsResponse with limits and calculations
	"""
	try:
		logger.info(f'Fetching limits for glider {glider_id}')

		glider = get_glider_by_id(glider_id)
		if not glider:
			logger.warning(f'Glider {glider_id} not found')
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f'Glider {glider_id} not found'
			)

		try:
			empty_weight = glider.empty_weight()
		except ValueError:
			empty_weight = None
			logger.debug(f'No weighing data for glider {glider_id}')

		try:
			cv_max = glider.cv_max()
		except ValueError:
			cv_max = None

		try:
			cu_max = glider.cu_max()
		except ValueError:
			cu_max = None

		try:
			cu = glider.cu()
		except ValueError:
			cu = None

		try:
			pilot_av_mini = glider.pilot_av_mini()
		except (ValueError, NotImplementedError):
			pilot_av_mini = None

		try:
			pilot_av_mini_duo = glider.pilot_av_mini_duo()
		except (ValueError, NotImplementedError):
			pilot_av_mini_duo = None

		try:
			pilot_av_maxi = glider.pilot_av_maxi()
		except (ValueError, NotImplementedError):
			pilot_av_maxi = None

		try:
			empty_arm = glider.empty_arm()
		except ValueError:
			empty_arm = None

		logger.info(f'Successfully retrieved limits for glider {glider_id}')
		return GliderCalculationsResponse(
			registration=glider.registration,
			model=glider.model,
			empty_weight=empty_weight,
			cv_max=cv_max,
			cu_max=cu_max,
			cu=cu,
			pilot_av_mini=pilot_av_mini,
			pilot_av_mini_duo=pilot_av_mini_duo,
			pilot_av_maxi=pilot_av_maxi,
			empty_arm=empty_arm,
		)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error fetching limits for glider {glider_id}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to fetch glider limits'
		)


@router.post('/{glider_id}/calculate', response_model=WeightBalanceCalculationResponse)
async def calculate_weight_and_balance(
	glider_id: str,
	request: WeightBalanceCalculationRequest,
):
	"""
	Calculate weight and balance for a glider with given loading (public endpoint).

	- **glider_id**: Registration number of the glider
	- **request**: WeightBalanceCalculationRequest with weights for:
		- front_pilot_weight: Weight of front pilot (kg)
		- rear_pilot_weight: Weight of rear pilot (kg)
		- front_ballast_weight: Weight of front ballast (kg)
		- rear_ballast_weight: Weight of rear ballast (kg)
		- wing_water_ballast_weight: Weight of water ballast (kg)
	- **Returns**: WeightBalanceCalculationResponse with total weight and CG
	"""
	try:
		logger.info(f'Calculating W&B for glider {glider_id}')

		glider = get_glider_by_id(glider_id)
		if not glider:
			logger.warning(f'Glider {glider_id} not found')
			raise HTTPException(
				status_code=status.HTTP_404_NOT_FOUND,
				detail=f'Glider {glider_id} not found'
			)

		if not glider.arms:
			logger.error(f'Arms data missing for glider {glider_id}')
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail='Glider arms data is not configured'
			)

		try:
			total_weight, cg = glider.weight_and_balance_calculator(
				request.front_pilot_weight,
				request.rear_pilot_weight,
				request.front_ballast_weight,
				request.rear_ballast_weight,
				request.wing_water_ballast_weight,
			)
		except ValueError as e:
			logger.warning(f'Calculation error for glider {glider_id}: {e}')
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail=str(e)
			)
		except NotImplementedError as e:
			logger.warning(f'Datum type not supported for glider {glider_id}: {e}')
			raise HTTPException(
				status_code=status.HTTP_400_BAD_REQUEST,
				detail='This glider datum type is not supported for calculations'
			)

		logger.info(f'W&B calculation complete: weight={total_weight}kg, cg={cg}mm')
		audit_user_id = 'unknown'

		event = f'Calcul centrage planeur pour {glider.registration} : {total_weight} kg, {round(cg,0)} mm'
		if audit_queries.create_audit_entry(user_id=audit_user_id, event=event) is None:
			logger.warning(f'Failed to create calculation audit event for glider {glider.registration}')

		return WeightBalanceCalculationResponse(
			total_weight=round(total_weight, 2),
			center_of_gravity=round(cg, 2),
		)
	except HTTPException:
		raise
	except Exception as e:
		logger.error(f'Error calculating W&B for glider {glider_id}: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to calculate weight and balance'
		)
