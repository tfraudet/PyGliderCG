import streamlit as st
import logging
import os

__version__ = "2.0.0"
DEFAULT_DB_NAME = './data/gliders.db'
DEFAULT_COOKIE_KEY = 'glider-cg-acph'
DEFAULT_LOG_LEVEL = 'INFO'

FAVICON_WEB = './img/icon/web/icon-512.png'

@st.cache_data()
def is_debug_mode() -> bool:
	debug = os.environ.get('APP_DEBUG_MODE', '').lower() in ('true', '1', 't')
	if 'APP_DEBUG_MODE' not in os.environ:
		logging.getLogger(__name__).warning('APP_DEBUG_MODE environment variable not defined, defaulting to False')

	logging.getLogger(__name__).info(f'APP_DEBUG_MODE is: {debug} ')
	return debug

@st.cache_data()
def get_database_name() -> str:
	dbanme = os.environ.get('DB_NAME', DEFAULT_DB_NAME)
	if 'DB_NAME' not in os.environ:
		logging.getLogger(__name__).warning('DB_NAME environment variable not defined, defaulting to DEFAULT_DB_NAME')

	logging.getLogger(__name__).info(f'DB_NAME is: {dbanme} ')
	return dbanme

@st.cache_data()
def get_cookie_key() -> str:
	cookie_key = os.environ.get('COOKIE_KEY', DEFAULT_COOKIE_KEY)
	if 'COOKIE_KEY' not in os.environ:
		logging.getLogger(__name__).warning('COOKIE_KEY environment variable not defined, defaulting to DEFAULT_COOKIE_KEY')

	logging.getLogger(__name__).info(f'COOKIE_KEY is: {cookie_key} ')
	return cookie_key

@st.cache_data()
def get_python_logger_level() -> int:
	log_level_name = os.environ.get('LOG_LEVEL', DEFAULT_LOG_LEVEL).upper()
	level = getattr(logging, log_level_name, logging.INFO)
	if 'LOG_LEVEL' not in os.environ:
		logging.getLogger(__name__).warning('LOG_LEVEL environment variable not defined, defaulting to INFO')

	logging.getLogger(__name__).info(f'LOG_LEVEL is: {log_level_name} ')
	return level