import duckdb
import bcrypt
import logging

logger = logging.getLogger(__name__)


def init_audit_log_table(conn):
	logger.debug('START init_audit_log_table()')

	sql = '''
			CREATE TABLE IF NOT EXISTS AUDITLOG (
				timestamp TIMESTAMP PRIMARY KEY,
				username VARCHAR,
				event VARCHAR,
			)
	'''
	conn.execute(sql)
	logger.debug('END init_audit_log_table()')


def init_users_table(conn):
	logger.debug('START init_users_table()')

	sql = '''
			CREATE TABLE IF NOT EXISTS USERS (
				username VARCHAR PRIMARY KEY,
				email VARCHAR,
				password VARCHAR,
				role VARCHAR,
			)
	'''
	conn.execute(sql)

	number_of_rows = conn.execute('SELECT count(*) FROM USERS').fetchone()[0]
	if number_of_rows == 0:
		logging.debug('No users in table USERS, insert a dummy user.')
		try:
			conn.execute('INSERT INTO USERS VALUES (?, ?, ?, ?)', [
				'admin',
				'admin@gmail.com',
				bcrypt.hashpw('admin'.encode('utf-8'), bcrypt.gensalt()),
				'administrator',
			])
		except duckdb.ConstraintException as e:
			logger.error(e)

	logger.debug('END init_users_table()')


def init_gliders_tables(conn):
	logger.debug('START init_gliders_tables()')

	sql = '''
			CREATE TABLE IF NOT EXISTS GLIDER (
				model VARCHAR,
				registration VARCHAR PRIMARY KEY,
				brand VARCHAR,
				serial_number VARCHAR,
				single_seat BOOLEAN,
				datum INTEGER,
				pilot_position INTEGER,
				datum_label VARCHAR,
				wedge VARCHAR,
				wedge_position VARCHAR,
				mmwp FLOAT,
				mmwv FLOAT,
				mmenp FLOAT,
				mm_harnais FLOAT,
				weight_min_pilot FLOAT,
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

	conn.execute('CREATE SEQUENCE IF NOT EXISTS auto_increment START WITH 1 INCREMENT BY 1')
	sql = '''
		CREATE TABLE IF NOT EXISTS WEIGHING (
		 	id INTEGER PRIMARY KEY DEFAULT nextval('auto_increment'),
			date DATE NOT NULL,
			registration VARCHAR,
			p1 DECIMAL(5,2),
			p2 DECIMAL(5,2),
			right_wing_weight DECIMAL(5,2),
			left_wing_weight DECIMAL(5,2),
			tail_weight DECIMAL(5,2),
			fuselage_weight DECIMAL(5,2),
			fix_ballast_weight DECIMAL(5,2) DEFAULT 0.0,
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

	conn.execute('CREATE SEQUENCE IF NOT EXISTS inventory_id_seq START WITH 1 INCREMENT BY 1')
	sql = '''
		CREATE TABLE IF NOT EXISTS INVENTORY (
			id INTEGER PRIMARY KEY DEFAULT nextval('inventory_id_seq'),
			registration VARCHAR,
			on_board BOOLEAN,
			instrument VARCHAR,
			brand VARCHAR,
			type VARCHAR,
			number VARCHAR,
			date DATE,
			seat VARCHAR,
			FOREIGN KEY (registration) REFERENCES GLIDER (registration)
		)
	'''
	conn.execute(sql)
	logger.debug('END init_gliders_tables()')


def initialize_database(dbname):
	conn = None
	try:
		logger.debug('initialise Database...')
		conn = duckdb.connect(dbname).cursor()
		init_users_table(conn)
		init_gliders_tables(conn)
		init_audit_log_table(conn)
	except Exception as e:
		logger.error(f'Error on database {dbname}: {e}')
	finally:
		if conn is not None:
			conn.close()
			logger.debug('Database connection closed')
