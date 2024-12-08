import streamlit as st
import logging

__version__ = "0.9.0"
DEFAULT_DB_NAME = './data/gliders.db'

def is_debug_mode() -> bool:
	try:
		debug = st.secrets['DEBUG_MODE']
	except KeyError as ke:
		debug = False
	return debug

def get_database_name() -> str:
	try:
		dbanme = st.secrets['DB_NAME']
	except KeyError as ke:
		dbanme = DEFAULT_DB_NAME
	logging.getLogger(__name__).debug('get_database_name(): database name: %s', dbanme)
	return dbanme