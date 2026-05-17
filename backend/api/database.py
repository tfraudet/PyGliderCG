"""FastAPI routes for database export and import operations"""

import io
import logging
import os
import shutil
import tempfile
import zipfile

import duckdb
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse

from backend.config import get_settings
from backend.middleware.auth import require_admin_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/database', tags=['database'])


@router.get('/export')
async def export_database(admin_user=Depends(require_admin_role)):
	"""Export the full database as a zip archive (Parquet format). Admin only."""
	settings = get_settings()
	export_dir = tempfile.mkdtemp()
	try:
		logger.info(f'Admin user {admin_user.username} exporting database')
		con = duckdb.connect(settings.DB_NAME)
		con.execute(f"EXPORT DATABASE '{export_dir}' (FORMAT PARQUET);")
		con.close()

		zip_buffer = io.BytesIO()
		with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
			for root, dirs, files in os.walk(export_dir):
				for file in files:
					file_path = os.path.join(root, file)
					arcname = os.path.relpath(file_path, export_dir)
					zipf.write(file_path, arcname)
		zip_buffer.seek(0)

		return StreamingResponse(
			zip_buffer,
			media_type='application/zip',
			headers={'Content-Disposition': 'attachment; filename="exported_db.zip"'},
		)
	except Exception as e:
		logger.error(f'Error exporting database: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to export database',
		)
	finally:
		shutil.rmtree(export_dir, ignore_errors=True)


@router.post('/import', status_code=status.HTTP_200_OK)
async def import_database(
	file: UploadFile = File(...),
	admin_user=Depends(require_admin_role),
):
	"""Import database from an uploaded zip archive (Parquet format). Admin only."""
	settings = get_settings()
	import_dir = tempfile.mkdtemp()
	temp_db_dir = tempfile.mkdtemp()
	temp_db_path = os.path.join(temp_db_dir, 'imported.duckdb')
	try:
		logger.info(f'Admin user {admin_user.username} importing database')

		zip_bytes = await file.read()
		with zipfile.ZipFile(io.BytesIO(zip_bytes), 'r') as zip_ref:
			zip_ref.extractall(import_dir)

		con = duckdb.connect(temp_db_path)
		con.execute(f"IMPORT DATABASE '{import_dir}';")
		con.close()

		os.replace(temp_db_path, settings.DB_NAME)
		temp_db_path = None

		logger.info(f'Database imported successfully by {admin_user.username}')
		return {'message': 'Database imported successfully'}
	except zipfile.BadZipFile as e:
		logger.error(f'Invalid zip file during import: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Invalid zip file: {e}',
		)
	except duckdb.Error as e:
		logger.error(f'Invalid database import content: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail=f'Invalid database export format: {e}',
		)
	except Exception as e:
		logger.error(f'Error importing database: {e}', exc_info=True)
		raise HTTPException(
			status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
			detail='Failed to import database',
		)
	finally:
		shutil.rmtree(import_dir, ignore_errors=True)
		shutil.rmtree(temp_db_dir, ignore_errors=True)
