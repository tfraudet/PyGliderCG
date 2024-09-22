# Import Pesée Planeur 2 database

import click
import pandas as pd
import duckdb
import datetime
import math

DB_NAME = './data/gliders.db'
__version__ = "1.0.0"

def init_database(dbname):
	# Init database
	conn = duckdb.connect(dbname)

	# Drop tables if exists
	conn.execute('DROP TABLE IF EXISTS WB_LIMIT')		# table limits centrage et masse
	conn.execute('DROP TABLE IF EXISTS WEIGHING')		# table pesées
	conn.execute('DROP TABLE IF EXISTS INVENTORY')		# table instruments installés
	conn.execute('DROP TABLE IF EXISTS GLIDER')			# table planeur
	conn.execute('DROP SEQUENCE IF EXISTS auto_increment')			

	# Create tables
	sql = '''
			CREATE TABLE IF NOT EXISTS GLIDER (
				model VARCHAR,
				registration VARCHAR PRIMARY KEY,
				brand VARCHAR,
				serial_number VARCHAR, 
				single_seat BOOLEAN,
				mmwp FLOAT,
				mmwv FLOAT,
				mmenp FLOAT,
				mm_harnais FLOAT,
				weight_min_pilot FLOAT,
				weight_max_pilot FLOAT,
				front_centering FLOAT,
				rear_centering FLOAT,
				arm_front_pilot FLOAT,
				arm_rear_pilot FLOAT,
				arm_waterballast FLOAT,
				arm_front_ballast FLOAT,
				arm_rear_watterballast_or_ballast FLOAT,
				arm_gas_tank FLOAT,
				arm_instruments_panel FLOAT,
			)
	'''
	conn.execute(sql)

	conn.execute('CREATE SEQUENCE auto_increment START WITH 1 INCREMENT BY 1')
	sql = '''
		CREATE TABLE IF NOT EXISTS WEIGHING (
		 	id INTEGER PRIMARY KEY DEFAULT nextval('auto_increment'),
			date DATE NOT NULL,
			registration VARCHAR,
			p1 FLOAT,
			p2 FLOAT,
			right_wing_weight FLOAT,
			left_wing_weight FLOAT,
			tail_weight FLOAT,
			fuselage_weight FLOAT,
			fix_ballast_weight FLOAT DEFAULT 0.0,
			A INTEGER DEFAULT 0,
			D INTEGER DEFAULT 0,
			FOREIGN KEY (registration) REFERENCES GLIDER (registration)
		)
	'''
	conn.execute(sql)

	sql = '''
		CREATE TABLE IF NOT EXISTS WB_LIMIT (
			registration VARCHAR,
			point_index INTEGER,
			center_of_gravity INTEGER,
			weight FLOAT,
			FOREIGN KEY (registration) REFERENCES GLIDER (registration)
		)
	'''
	conn.execute(sql)

	sql = '''
		CREATE TABLE IF NOT EXISTS INVENTORY (
			registration VARCHAR,
			on_board BOOLEAN,
			instrument VARCHAR,
			brand VARCHAR,
			type VARCHAR,
			number VARCHAR,
			date VARCHAR,
			seat VARCHAR,
			FOREIGN KEY (registration) REFERENCES GLIDER (registration)
		)
	'''
	conn.execute(sql)

	return conn

@click.command()
@click.argument('filename', type=click.Path(exists=True))
@click.version_option(__version__ , '-v', '--version')
def cli(filename):
	"""
		Import excel export of Pesée Planeur 2 database.\n
	"""

	# read the excel file in a dataset pandas frame
	click.echo('Read file {}\n'.format(click.format_filename(filename)))
	df = pd.read_excel(click.format_filename(filename),  engine='xlrd', decimal=',')
	print(df.info(verbose=True))
	# print(df.dtypes)
	# print(df.columns.tolist())

	# Init database
	conn = init_database(DB_NAME)

	# save data to duck DB database
	for index, row in df.iterrows():

		# Insert data in GLIDER table
		conn.execute('INSERT INTO GLIDER VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',[
			row['TypeMarque'],							# model
			row['Immat'],								# registration
			row['Marque'],								# brand
			row['NumSerie'],							# serial_number
			True if row['Mono'] == 1 else False,		# Single_seat

			# Limits
			row['MMWP'],								# mmwp
			row['MMWV'],								# mmwv
			row['MMENP'],								# mmenp
			row['MMHar'],								# mm_harnais
			row['MinPil'],								# weight_min_pilot
			row['MaxPil'],								# weight_max_pilot
			row['LimCenAv'],							# front_centering
			row['LimCenAr'],							# rear_centering

			# Arms
			0.0 if math.isnan(row['BLPilAv']) else row['BLPilAv'],			# arm_front_pilot
			0.0 if math.isnan(row['BLPilAr']) else row['BLPilAr'],			# arm_rear_pilot
			0.0 if math.isnan(row['BLWa']) else row['BLWa'],				# arm_waterballast
			0.0 if math.isnan(row['BLGAv']) else row['BLGAv'],				# arm_front_ballast
			0.0 if math.isnan(row['BLGAr']) else row['BLGAr'],				# arm_rear_watterballast_or_ballast
			0.0 if math.isnan(row['BLEss']) else row['BLEss'],				# arm_gas_tank
			0.0 if math.isnan(row['BLTB']) else row['BLTB'],				# arm_instruments_panel
			
		])
		print('Insert glider {} in database...'.format(row['NomPlaneur']))

		# Insert data in WB_POINT table
		center_gravity_points = row.loc['C1':'C10'].reset_index(drop=True)
		center_gravity_points.name='C.G'
		weight_points = row.loc['Ma1':'Ma10'].reset_index(drop=True)
		weight_points.name='Weight'
		wc_df = pd.concat([center_gravity_points, weight_points], axis=1).dropna()
		
		for point_idx, point in wc_df.iterrows():
			conn.execute('INSERT INTO WB_LIMIT VALUES (?, ?, ?, ?)',[
				row['Immat'],								# registration
				point_idx,									# point_index
				point['C.G'],								# center_of_gravity
				point['Weight'],							# weight
				
			])
			print('  insert weight & balance point {} for glider {}'.format(point_idx, row['Immat']))

		# Insert data in WEIGHING table
		conn.execute("INSERT INTO WEIGHING VALUES (nextval('auto_increment'), current_date(), {}, {}, {}, {}, {}, {}, {}, {}, {}, {})".format(
			"'"+row['Immat']+"'",											# registration
			row['P1'],														# p1
			row['P2'],														# p2
			row['AileD'],													# right_wing_weight
			row['AileG'],													# left_wing_weight
			row['EmpH'],													# tail_weight
			row['Fuse'],													# fuselage_weight
			0.0 if math.isnan(row['LestFixe']) else row['LestFixe'],		# fix_ballast_weight
			row['DistA'],													# A
			row['DistD'],													# B
			
		))
		print('  insert weighing for glider {}'.format(row['Immat']))

		# Insert equiments installed in INVENTORY table
		instruments = row.loc[["E{}".format(i) for i in range(1, 26)]].reset_index(drop=True)
		instruments.name = "Instrument"
		brand = row.loc[["M{}".format(i) for i in range(1, 26)]].reset_index(drop=True)
		brand.name = "Brand"
		on_board = row.loc[["B{}".format(i) for i in range(1, 26)]].reset_index(drop=True)
		on_board.name = 'On-Board'
		unknow = row.loc[["N{}".format(i) for i in range(1, 26)]].reset_index(drop=True)
		unknow.name = 'N'
		type = row.loc['T1':'T25'].reset_index(drop=True)
		type.name='Type'
		number = row.loc['Nu1':'Nu25'].reset_index(drop=True)
		number.name='N°'
		seat = row.loc['D1':'D17'].reset_index(drop=True)
		seat.name='Seat'
		inventory_df = pd.concat([on_board, unknow, instruments, brand, type, number, seat], axis=1)
		mask = inventory_df[['Instrument', 'Brand', 'Type', 'N°', 'Seat']].isnull().all(axis=1)
		inventory_df = inventory_df.loc[~mask]
		inventory_df['On-Board'] = inventory_df['On-Board'].apply(lambda x: x == 1)
		
		for equ_idx, equipement in inventory_df.iterrows():
			conn.execute('INSERT INTO INVENTORY VALUES (?, ?, ?, ?, ?, ?, ?, ?)',[
				row['Immat'],									# registration
				equipement['On-Board'],							# on_board
				equipement['Instrument'],						# instrument
				equipement['Brand'],							# brand
				equipement['Type'],								# type
				equipement['N°'],								# number
				"",												# date
				equipement['Seat'],								# seat
			])
			print('  insert equipement {} for glider {}'.format(equ_idx, row['Immat']))

		conn.commit()

	conn.close()

	return 0 # successful

if __name__ == '__main__':
	cli()