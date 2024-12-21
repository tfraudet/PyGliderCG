import time
import streamlit as st
import pandas as pd
import logging

from audit_log import AuditLogDuckDB
from config import get_database_name
from pages.sidebar import sidebar_menu
from users import fetch_users

logger = logging.getLogger(__name__)

@st.dialog('Effacer l\'audit log')
def delete_audit_log(audit : AuditLogDuckDB):
	if st.button('Confirmer'):
		with st.spinner('Effacement de l\'audit log en cours...'):
			audit.delete_events()
		st.rerun()

logger.debug('START audit_ui.py')
st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon='✈️',
	layout='wide',
	# initial_sidebar_state='expanded'
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header(':material/description: Audit log')
	users = fetch_users()
	sidebar_menu(users)
	
	# audit_logger = AuditLogDuckDB().set_database_name(get_database_name())
	audit_logger = AuditLogDuckDB()
	# st.write(audit_logger)

	st.dataframe(audit_logger.load_events(),hide_index=True, use_container_width=True,
		column_config={
			'timestamp' : st.column_config.DatetimeColumn('Horodatage', width='small', format='DD-MM-YYYY à HH:mm:ss'),
			'username': st.column_config.Column('Nom utilisateur', width='small'),
			'event': st.column_config.Column('Evénement', width='large'),	
		}
	)

	if st.button(":material/delete: Effacer l\'audit log"):
		delete_audit_log(audit_logger)

# st.write(st.session_state)
logger.debug('END audit_ui.py')
 