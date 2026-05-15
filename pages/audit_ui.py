import streamlit as st
import pandas as pd
import logging

from backend_client import BackendClient
from config import FAVICON_WEB
from pages.sidebar import sidebar_menu

logger = logging.getLogger(__name__)
client = BackendClient()

@st.cache_data(show_spinner='Chargement de l\'audit log...')
def fetch_audit_logs():
	return client.get_audit_logs(limit=1000)

@st.dialog('Effacer l\'audit log')
def delete_audit_log():
	if st.button('Confirmer'):
		with st.spinner('Effacement de l\'audit log en cours...'):
			if client.delete_audit_logs():
				fetch_audit_logs.clear()
				st.success('Audit log effacé avec succès', icon=':material/check_circle:')
				st.rerun()
			else:
				st.error('Échec de l\'effacement de l\'audit log', icon=':material/error:')

logger.debug('START audit_ui.py')
st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon=FAVICON_WEB,
	layout='wide',
	# initial_sidebar_state='expanded'
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header(':material/description: Audit log')
	sidebar_menu()

	audit_response = fetch_audit_logs()
	audit_items = audit_response.get('items', []) if audit_response else []

	if not audit_items:
		st.info('Aucun événement d\'audit disponible.', icon=':material/info:')
	else:
		audit_df = pd.DataFrame(audit_items)

		st.dataframe(audit_df, hide_index=True, width='stretch',
			column_config={
				'timestamp' : st.column_config.DatetimeColumn('Horodatage', width='small', format='DD-MM-YYYY à HH:mm:ss'),
				'user_id': st.column_config.Column('Nom utilisateur', width='small'),
				'event': st.column_config.Column('Evénement', width='large'),
			},
			column_order=['timestamp', 'user_id', 'event']
		)

	if st.button(":material/delete: Effacer l\'audit log"):
		delete_audit_log()

# st.write(st.session_state)
logger.debug('END audit_ui.py')
 