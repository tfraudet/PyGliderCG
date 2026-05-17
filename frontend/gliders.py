from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
import logging
from typing import List, Tuple, Optional

import pandas as pd
import streamlit as st

from frontend.backend_client import BackendClient
from frontend.config import get_asset_path

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
			'image': get_asset_path('datum-hd-1.png')
		},
	DatumWeighingPoints.DATUM_WING_1POINT_AFT_OF_DATUM: {
			'label': 'Bord d\'attaque de l\'aile - 1 point en avant de la référence',
			'image': get_asset_path('datum-hd-2.png'),
	   },
	DatumWeighingPoints.DATUM_WING_WHEEL_FORWARD_OF_DATUM: {
			'label' : 'Bord d\'attaque de l\'aile - Train principal en avant de la référence',
			'image': get_asset_path('datum-hd-4.png'),
		},
	DatumWeighingPoints.DATUM_FORWARD_GLIDER: {
			'label' : 'Devant le planeur - 2 point en arrière de la référence',
			'image': get_asset_path('datum-hd-snc34c.png'),
		}
	# DatumWeighingPoints.DATUM_FORWARD_GLIDER: {
	# 		'label' : 'Devant le planeur',
	# 		'image': get_asset_path('datum-hd-3.png'),
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
