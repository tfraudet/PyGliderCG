from datetime import datetime
import streamlit as st
import pandas as pd
import logging

from config import FAVICON_WEB
from pages.sidebar import sidebar_menu
from backend_client import BackendClient, NotFoundError, BackendException
from weighing_sheet import display_detail_weighing

logger = logging.getLogger(__name__)
client = BackendClient()

def handle_button_state(action):
	_ = action
	pass

logger.debug('START weighing_ui.py')
st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon=FAVICON_WEB,
	layout='wide',
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header(':material/balance: Peser planeur')
	
	try:
		gliders_list = client.get_gliders()
		if not gliders_list:
			st.error('Impossible de charger la liste des planeurs')
			logger.error('Failed to fetch gliders')
			st.stop()
		
		gliders_dict = {g['registration']: g for g in gliders_list}
		sidebar_menu()

		if 'selected_registration' not in st.session_state:
			st.session_state.selected_registration = ''

		gliders_options = list(gliders_dict.keys())
		selected_registration = st.selectbox('Choisir un planeur', gliders_options, 
			index=gliders_options.index(st.session_state.selected_registration) if st.session_state.selected_registration in gliders_options else 0,
			on_change=handle_button_state, args=('select', ))
		st.session_state.selected_registration = selected_registration
		current_glider = gliders_dict.get(selected_registration)

		if current_glider is not None:
			st.subheader('Liste des pesées précédentes pour ce planeur')
			
			weighings = current_glider.get('weighings', [])
			weighings_data = []
			
			if weighings:
				for w in weighings:
					weighings_data.append({
						'id': w.get('id'),
						'date': datetime.fromisoformat(w['date']).date() if isinstance(w['date'], str) else w['date'],
						'p1': w.get('p1', 0.0),
						'p2': w.get('p2', 0.0),
						'A': w.get('A', 0),
						'D': w.get('D', 0),
						'right_wing_weight': w.get('right_wing_weight', 0.0),
						'left_wing_weight': w.get('left_wing_weight', 0.0),
						'tail_weight': w.get('tail_weight', 0.0),
						'fuselage_weight': w.get('fuselage_weight', 0.0),
						'fix_ballast_weight': w.get('fix_ballast_weight', 0.0),
					})
				
				weighings_df = pd.DataFrame(weighings_data)
				st.dataframe(weighings_df, width='stretch', hide_index=True)
			else:
				st.info('Aucune pesée enregistrée pour ce planeur', icon=':material/info:')

			st.divider()
			
			if weighings_data:
				weighing_options = [f'pesée #{w["id"]} du {w["date"].strftime("%d/%m/%Y")}' for w in weighings_data]
				selected_idx = st.selectbox('Sélectionner une pesée', range(len(weighings_data)), 
					format_func=lambda i: weighing_options[i] if i < len(weighing_options) else '')
				
				if selected_idx is not None and selected_idx < len(weighings_data):
					selected_weighing = weighings_data[selected_idx]
					display_detail_weighing(selected_weighing, current_glider, True)
			else:
				st.info('Aucune pesée disponible', icon=':material/info:')

			# Editable section for adding new weighings
			st.divider()
			st.subheader('Ajouter une nouvelle pesée')

			empty_weighing_df = pd.DataFrame({
				'date': pd.Series(dtype='str'),
				'p1': pd.Series(dtype='float'),
				'p2': pd.Series(dtype='float'),
				'A': pd.Series(dtype='int'),
				'D': pd.Series(dtype='int'),
				'right_wing_weight': pd.Series(dtype='float'),
				'left_wing_weight': pd.Series(dtype='float'),
				'tail_weight': pd.Series(dtype='float'),
				'fuselage_weight': pd.Series(dtype='float'),
				'fix_ballast_weight': pd.Series(dtype='float'),
			})

			with st.form(key='add_weighing_form'):
				edited_weighings = st.data_editor(
					empty_weighing_df,
					key='weighing_edit',
					num_rows='dynamic',
					width='stretch',
				)
				submitted = st.form_submit_button('Enregistrer', icon=':material/save:')

			if submitted:
				if 'weighing_edit' in st.session_state and len(st.session_state.weighing_edit.get('added_rows', [])) > 0:
					weighings_to_save = []
					for row in st.session_state.weighing_edit['added_rows']:
						date_val = row.get('date', str(datetime.now().date()))
						if not date_val:
							date_val = str(datetime.now().date())
						weighings_to_save.append({
							'date': date_val,
							'p1': float(row.get('p1', 0.0)),
							'p2': float(row.get('p2', 0.0)),
							'A': int(row.get('A', 0)),
							'D': int(row.get('D', 0)),
							'right_wing_weight': float(row.get('right_wing_weight', 0.0)),
							'left_wing_weight': float(row.get('left_wing_weight', 0.0)),
							'tail_weight': float(row.get('tail_weight', 0.0)),
							'fuselage_weight': float(row.get('fuselage_weight', 0.0)),
							'fix_ballast_weight': float(row.get('fix_ballast_weight', 0.0)),
						})
					if selected_registration and client.save_weighings(selected_registration, weighings_to_save):
						st.success('Pesée(s) ajoutée(s) avec succès', icon=':material/check_circle:')
				else:
					st.info('Aucune nouvelle pesée à sauvegarder', icon=':material/info:')

		else:
			st.warning('Aucun planeur sélectionné', icon=':material/warning:')
			
	except NotFoundError:
		st.error('Planeur non trouvé')
	except BackendException as e:
		st.error(f'Erreur lors de l\'accès aux données: {str(e)}')
		logger.error(f'Backend error: {e}')
	except Exception as e:
		st.error(f'Une erreur inattendue s\'est produite: {str(e)}')
		logger.error(f'Unexpected error: {e}')

logger.debug('END weighing_ui.py')