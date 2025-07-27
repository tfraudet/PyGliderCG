import datetime
import pytest
from gliders import Glider, Limits, Arms, Weighing, DatumWeighingPoints, DatumPilotPosition

@pytest.fixture
def glider_FCGUP():
	limits = Limits(mmwp=525.0, mmwv=525.0, mmenp=235.0, mm_harnais=110.0, weight_min_pilot=70.0, front_centering=250.0, rear_centering=400.0)
	arms = Arms(arm_front_pilot=513.0, arm_rear_pilot=0.0, arm_waterballast=0.0, arm_front_ballast=0.0, arm_rear_watterballast_or_ballast=0.0, arm_gas_tank=0.0, arm_instruments_panel=0.0)
	weighing = Weighing(id=1, date=datetime.date(2019, 4, 23), p1=256.0, p2=28.8, right_wing_weight=75.8, left_wing_weight=77.0, tail_weight=6.8, fuselage_weight=125.2, fix_ballast_weight=0.0, A=178, D=4178)
	weight_and_balances = [(250, 200.0), (250, 525.0), (400, 525.0), (400, 200.0), (250, 200.0)]
	glider = Glider(
		model="LS6c 18M",
		registration="F-CGUP",
		brand="Rolladen-Schneider",
		serial_number=6244,
		single_seat=True,
		datum=DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value,
		pilot_position=DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value,
		datum_label="Bord d'attaque de l'aile à l'emplanture",
		wedge="horizontalité",
		wedge_position="génératrice inférieure du cône arrière du fuselage",
		limits=limits,
		arms=arms,
		weighings = [weighing],
		weight_and_balances=weight_and_balances
	)

	return glider

@pytest.fixture
def glider_D2080():
	limits = Limits(mmwp=525.0, mmwv=391.0, mmenp=250.0, mm_harnais=110.0, weight_min_pilot=70.0, front_centering=250.0, rear_centering=380.0)
	arms = Arms(arm_front_pilot=520.0, arm_rear_pilot=0.0, arm_waterballast=179.0, arm_front_ballast=1675.0, arm_rear_watterballast_or_ballast=4275.0, arm_gas_tank=0.0, arm_instruments_panel=0.0)
	weighing = Weighing(id=4, date=datetime.date(2024, 10, 31), p1=250.2, p2=34.0, right_wing_weight=75.0, left_wing_weight=75.0, tail_weight=7.0, fuselage_weight=127.2, fix_ballast_weight=0.0, A=100, D=4145)
	weight_and_balances = [(250, 525.0), (380, 525.0), (380, 200.0), (250, 200.0), (250, 525.0)]
	glider = Glider(
		model="Ventus 2c 18 mètres",
		registration="D-2080",
		brand="Schempp-Hirth",
		serial_number=62,
		single_seat=True,
		datum=DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value,
		pilot_position=DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value,
		datum_label="Bord d'attaque de l'aile à l'emplature",
		wedge="44/1000",
		wedge_position="arête supérieure arrière du fuselage",
		limits=limits,
		arms=arms,
		weighings = [weighing],
		weight_and_balances=weight_and_balances
	)

	return glider

@pytest.fixture
def glider_FCGDT():
	limits = Limits(mmwp=590.0, mmwv=590.0, mmenp=400.0, mm_harnais=110.0, weight_min_pilot=70.0, front_centering=40.0, rear_centering=270.0)
	arms = Arms(arm_front_pilot=1300.0, arm_rear_pilot=190.0, arm_waterballast=168.0, arm_front_ballast=1890.0, arm_rear_watterballast_or_ballast=0.0, arm_gas_tank=0.0, arm_instruments_panel=0.0)
	weighing = Weighing(id=3, date=datetime.date(2015, 2, 27), p1=382.4, p2=28.5, right_wing_weight=111.3, left_wing_weight=108.2, tail_weight=7.7, fuselage_weight=183.7, fix_ballast_weight=0.0, A=164, D=5250)
	weight_and_balances = [(40, 400.0), (40, 590.0), (270, 590.0), (270, 400.0), (40, 400.0)]
	glider = Glider(
		model="Janus C",
		registration="F-CJDT",
		brand="Schempp Hirth",
		serial_number=170,
		single_seat=False,
		datum=DatumWeighingPoints.DATUM_WING_2POINTS_AFT_OF_DATUM.value,
		pilot_position=DatumPilotPosition.PILOT_FORWARD_OF_DATUM.value,
		datum_label="bord d'attaque de l'aile à l'emplanture",
		wedge="45/1000",
		wedge_position="arête supérieur arrière du fuselage",
		limits=limits,
		arms=arms,
		weighings = [weighing],
		weight_and_balances=weight_and_balances
	)

	return glider


@pytest.fixture
def glider_FCJBH():
	limits = Limits(mmwp=540.0, mmwv=540.0, mmenp=370.0, mm_harnais=110.0, weight_min_pilot=70.0, front_centering=2199.0, rear_centering=2350.0)
	arms = Arms(arm_front_pilot=1040.0, arm_rear_pilot=2030.0, arm_waterballast=0.0, arm_front_ballast=74.0, arm_rear_watterballast_or_ballast=0.0, arm_gas_tank=0.0, arm_instruments_panel=0.0)
	weighing = Weighing(id=11, date=datetime.date(2022, 12, 31), p1=4.1, p2=357.3, right_wing_weight=90.0, left_wing_weight=90.4, tail_weight=12.4, fuselage_weight=166.7, fix_ballast_weight=1.9, A=470, D=2635)
	weight_and_balances = [(2199, 540.0), (2350, 540.0), (2350, 360.0), (2199, 360.0), (2199, 540.0)]
	glider = Glider(
		model="Alliance",
		registration="F-CJBH",
		brand="SN Centrair",
		serial_number=0,
		single_seat=False,
		datum=DatumWeighingPoints.DATUM_FORWARD_GLIDER.value,
		pilot_position=DatumPilotPosition.PILOT_AFT_OF_DATUM.value,
		datum_label="",
		wedge="",
		wedge_position="",
		limits=limits,
		arms=arms,
		weighings = [weighing],
		weight_and_balances=weight_and_balances
	)

	return glider

class Test_Glider_FCGUP:
	def test_glider(self, glider_FCGUP: Glider):
		glider = glider_FCGUP
		last_weighing = glider.last_weighing()

		assert glider.model == "LS6c 18M"
		assert glider.registration == "F-CGUP"

		assert glider.empty_weight() == 284.8
		assert last_weighing is not None
		assert last_weighing.mvenp() == 132.0

		assert glider.cu_max() == 103.0
		assert glider.cv_max() == 240.2
		assert glider.cu() == 103.0
		assert glider.pilot_av_mini() == 62.4
		assert glider.pilot_av_maxi() == 130.6
		assert glider.empty_arm() == 600.0

	def test_center_gravity_calculation(self, glider_FCGUP: Glider):
		glider = glider_FCGUP

		assert glider.weight_and_balance_calculator(
			front_pilot_weight = 80.0,
			rear_pilot_weight = 0.0,
			front_ballast_weight = 0.0,
			rear_ballast_weight = 0.0,
			wing_water_ballast_weight =0.0) == ( 364.8, pytest.approx(356, abs=0.5)) 

class Test_Glider_D2080:
	def test_glider(self, glider_D2080: Glider):
		glider = glider_D2080
		last_weighing = glider.last_weighing()

		assert glider.model == "Ventus 2c 18 mètres"
		assert glider.registration == "D-2080"

		assert glider.empty_weight() == 284.2
		assert last_weighing is not None
		assert last_weighing.mvenp() == 134.2

		assert glider.cu_max() == 115.8
		assert glider.cv_max() == 106.8
		assert glider.cu() == 106.8
		assert glider.pilot_av_mini() == 68.2
		assert glider.pilot_av_maxi() == 127.7
		assert glider.empty_arm() == 596.0

	def test_center_gravity_calculation(self, glider_D2080: Glider):
		'''Test the weight and gravity center calculation for the D-2080 glider without balast'''
		glider = glider_D2080

		assert glider.weight_and_balance_calculator(
			front_pilot_weight = 80.0,
			rear_pilot_weight = 0.0,
			front_ballast_weight = 0.0,
			rear_ballast_weight = 0.0,
			wing_water_ballast_weight =0.0) == ( 364.2, pytest.approx(351, abs=0.5)) 
		
	def test_center_gravity_calculation_tail_ballast(self, glider_D2080: Glider):
		'''Test the weight and gravity center calculation for the D-2080 glider with tail balast'''
		glider = glider_D2080

		assert glider.weight_and_balance_calculator(
			front_pilot_weight = 80.0,
			rear_pilot_weight = 0.0,
			front_ballast_weight = 0.0,
			rear_ballast_weight = 2.0,
			wing_water_ballast_weight =0.0) == ( 366.2, pytest.approx(372, abs=0.5)) 
		
	def test_center_gravity_calculation_wing_ballast(self, glider_D2080: Glider):
		'''Test the weight and gravity center calculation for the D-2080 glider with wing balast'''
		glider = glider_D2080

		assert glider.weight_and_balance_calculator(
			front_pilot_weight = 80.0,
			rear_pilot_weight = 0.0,
			front_ballast_weight = 0.0,
			rear_ballast_weight = 0.0,
			wing_water_ballast_weight = 50.0) == ( 414.2, pytest.approx(330, abs=0.5)) 


class Test_Glider_FCGDT:
	def test_glider(self, glider_FCGDT: Glider):
		glider = glider_FCGDT
		last_weighing = glider.last_weighing()

		assert glider.model == "Janus C"
		assert glider.registration == "F-CJDT"

		assert glider.empty_weight() == 410.9
		assert last_weighing is not None
		assert last_weighing.mvenp() == 191.4

		assert glider.cu_max() == 208.6
		assert glider.cv_max() == 179.1
		assert glider.cu() == 179.1
		assert glider.pilot_av_mini() == 67.5
		assert glider.pilot_av_maxi() == 149.6
		assert glider.empty_arm() == 528.0

	def test_center_gravity_calculation(self, glider_FCGDT: Glider):
		glider = glider_FCGDT

		assert glider.weight_and_balance_calculator(
			front_pilot_weight = 65.0,
			rear_pilot_weight = 80.0,
			front_ballast_weight = 0.0,
			rear_ballast_weight = 0.0,
			wing_water_ballast_weight =0.0) == ( 555.9, pytest.approx(211, abs=0.5)) 

class Test_Glider_FCJBH:
	def test_glider(self, glider_FCJBH: Glider):
		glider = glider_FCJBH
		last_weighing = glider.last_weighing()

		assert glider.model == "Alliance"
		assert glider.registration == "F-CJBH"

		assert glider.empty_weight() == 361.4
		assert last_weighing is not None
		assert last_weighing.mvenp() == 181.0

		assert glider.cu_max() == 189.0
		assert glider.cv_max() == 178.6
		assert glider.cu() == 178.6
		assert glider.pilot_av_mini() == 71.7
		assert glider.pilot_av_maxi() == 128.2
		assert glider.empty_arm() == 2610.0

	def test_center_gravity_calculation(self, glider_FCJBH: Glider):
		glider = glider_FCJBH

		weight, gc = glider.weight_and_balance_calculator(
			front_pilot_weight = 60.0,
			rear_pilot_weight = 80.0,
			front_ballast_weight = 0.0,
			rear_ballast_weight = 0.0,
			wing_water_ballast_weight =0.0)

		assert weight == 501.4
		assert gc == pytest.approx(2330, abs=0.5)
