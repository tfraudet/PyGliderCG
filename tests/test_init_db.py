import duckdb

from backend.init_db import initialize_database


def _column_type(conn, table_name: str, column_name: str) -> str:
	rows = conn.execute(f"PRAGMA table_info('{table_name}')").fetchall()
	for row in rows:
		if row[1] == column_name:
			return str(row[2]).upper()
	raise AssertionError(f'Column {column_name} not found in table {table_name}')


def test_glider_limits_columns_are_double(tmp_path):
	db_path = tmp_path / 'precision_test.duckdb'
	initialize_database(str(db_path))

	conn = duckdb.connect(str(db_path))
	try:
		assert _column_type(conn, 'GLIDER', 'mmenp') == 'DOUBLE'
		assert _column_type(conn, 'WB_LIMIT', 'weight') == 'DOUBLE'
	finally:
		conn.close()
