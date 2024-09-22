from dataclasses import dataclass, field
from datetime import date

import duckdb
import pandas as pd

DB_NAME = './data/gliders.db'

@dataclass
class Limits:
	# weight limits
	mmwp : float
	mmwv : float
	mmenp : float
	mm_harnais : float
	weight_min_pilot : float
	weight_max_pilot : float

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
	p1: float
	p2: float
	right_wing_weight: float
	left_wing_weight: float
	tail_weight: float
	fuselage_weight: float
	fix_ballast_weight: float = 0.0
	A: int = 0
	D: int = 0

@dataclass
class Instrument:
	on_board: bool
	instrument : str
	brand: str
	type: str
	number: str
	date: str
	seat: str

@dataclass
class Glider:
	model : str
	registration : str
	brand : str
	serial_number : int
	single_seat : bool

	limits : Limits = None
	arms: Arms = None

	# weighings : Weighing = None
	weighings : list[tuple[date, Weighing]] = field(default_factory=list)

	weight_and_balances: list[(int, float)] = field(default_factory=list)  # list of tuple (centering in mm, weight in Kg)

	instruments: list[Instrument] = field(default_factory=list)

	def limits_to_pandas(self) -> pd.DataFrame:
		return pd.DataFrame(self.weight_and_balances, columns=['centering', 'mass'])

	@classmethod
	def from_database(cls, database_name: str) -> dict:
		conn = duckdb.connect(database_name)
		results  = conn.execute('SELECT * from GLIDER').fetchall()

		def construct_row(values) -> Glider:
			main_values = values[:5]
			limits_value = values[5:13]
			arm_values = values[13:20]
			aGlider = Glider(*main_values)
			aGlider.limits = Limits(*limits_value)
			aGlider.arms = Arms(*arm_values)

			# load weight & balanace limit points for this glider
			points = conn.execute("SELECT * from WB_LIMIT WHERE registration='{}'".format(values[1])).fetchall()
			aGlider.weight_and_balances = [(p[2], p[3]) for p in points]

			# load weighings for this glider
			weighings = conn.execute("SELECT * from WEIGHING WHERE registration='{}'".format(values[1])).fetchall()
			aGlider.weighings = [ (item[1], Weighing(*item[3:])) for item in weighings]

			# load equipements for this glider
			weighings = conn.execute("SELECT * from INVENTORY WHERE registration='{}'".format(values[1])).fetchall()
			aGlider.instruments = [ Instrument(*item[1:8]) for item in weighings]

			return aGlider
		
		rows = { x[1]: construct_row(x) for x in results}
		conn.close()
		return rows
	
	def last_weighing(self) -> Weighing:
		return max(self.weighings, key=lambda x: x[0])[1]
	
	def empty_weight(self) -> float:
		last_weighing = self.last_weighing()
		return last_weighing.p1 + last_weighing.p2

	def empty_arm(self) -> float:
		# X0 = D1 +d
		# D1 = M2 * D / (M1 + M2)
		last_weighing = self.last_weighing()
		D1 = last_weighing.D * last_weighing.p2 / (last_weighing.p1 + last_weighing.p2)
		x0 = D1 + last_weighing.A
		return x0
	
	def weight_and_balance_calculator(self, front_pilot_weight, rear_pilot_weight, front_ballast_weight, rear_ballast_weight, wing_water_ballast_weight):
		'''
		return the total weight of the glider (kg) and the balance (mm)
		'''

		# TODO: Calcul valide si  et seulement si la référence est le bord d'attage de l'aile
		glider_weight = self.empty_weight() + front_pilot_weight + rear_pilot_weight + front_ballast_weight + rear_ballast_weight + wing_water_ballast_weight
		moment_arm = (
				self.empty_weight() * self.empty_arm() +
				front_pilot_weight * self.arms.arm_front_pilot * -1 +
				rear_pilot_weight * self.arms.arm_rear_pilot * -1 +
				front_ballast_weight * self.arms.arm_front_ballast *-1 +
				rear_ballast_weight * self.arms.arm_rear_watterballast_or_ballast +
				wing_water_ballast_weight * self.arms.arm_waterballast
			)
		return glider_weight, moment_arm / glider_weight


if __name__ == '__main__':
	gliders = Glider.from_database(DB_NAME)
	print(gliders)
	
	# conn = duckdb.connect(DB_NAME)
	# conn.sql("select g.*, p.* from GLIDER g JOIN WB_LIMIT p USING (registration) ").show()

