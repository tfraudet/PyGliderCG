import streamlit as st
import logging
import os

__version__ = "0.9.5"
DEFAULT_DB_NAME = './data/gliders.db'
DEFAULT_COOKIE_KEY = 'glider-cg-acph'

FAVICON_WEB = './img/icon/web/icon-512.png'

@st.cache_data()
def is_debug_mode() -> bool:
	# try first to get value from environment variables
	try:
		debug = os.environ['APP_DEBUG_MODE'].lower() in ('true', '1', 't')
	except KeyError as ke:
		logging.getLogger(__name__).warning('APP_DEBUG_MODE environment variable not defined' )

		# if not found in environment variables look in secrets.toml file 
		try:
			debug = st.secrets['APP_DEBUG_MODE']
		except KeyError as ke:
			logging.getLogger(__name__).warning('APP_DEBUG_MODE not found in secrets.toml file, defaulting to False')
			debug = False
		except Exception as e:
			logging.getLogger(__name__).warning(f'secrets.toml file not found, defaulting to False: error is: {e} ')
			debug = False

	logging.getLogger(__name__).info(f'APP_DEBUG_MODE is: {debug} ')
	return debug

@st.cache_data()
def get_database_name() -> str:
	# try first to get value from environment variables
	try:
		dbanme = os.environ['DB_NAME']
	except KeyError as ke:
		logging.getLogger(__name__).warning('DB_NAME environment variable not defined' )

		# if not found in environment variables look in secrets.toml file 
		try:
			dbanme = st.secrets['DB_NAME']
		except KeyError as ke:
			logging.getLogger(__name__).warning('DB_NAME not found in secrets.toml file, defaulting to DEFAULT_DB_NAME')
			dbanme = DEFAULT_DB_NAME
		except Exception as e:
			logging.getLogger(__name__).warning(f'secrets.toml file not found, defaulting to DEFAULT_DB_NAME: error is: {e} ')
			dbanme = DEFAULT_DB_NAME

	logging.getLogger(__name__).info(f'DB_NAME is: {dbanme} ')
	return dbanme

@st.cache_data()
def get_cookie_key() -> str:
	# try first to get value from environment variables
	try:
		cookie_key = os.environ['COOKIE_KEY']
	except KeyError as ke:
		logging.getLogger(__name__).warning('COOKIE_KEY environment variable not defined' )

		# if not found in environment variables look in secrets.toml file 
		try:
			cookie_key = st.secrets['COOKIE_KEY']
		except KeyError as ke:
			logging.getLogger(__name__).warning('COOKIE_KEY not found in secrets.toml file, defaulting to DEFAULT_DB_NAME')
			cookie_key = DEFAULT_COOKIE_KEY
		except Exception as e:
			logging.getLogger(__name__).warning(f'secrets.toml file not found, defaulting to DEFAULT_DB_NAME: error is: {e} ')
			cookie_key = DEFAULT_COOKIE_KEY

	logging.getLogger(__name__).info(f'COOKIE_KEY is: {cookie_key} ')
	return cookie_key