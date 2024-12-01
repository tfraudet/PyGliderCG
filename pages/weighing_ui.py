from datetime import datetime
import streamlit as st
import pandas as pd
import logging

from pages.sidebar import sidebar_menu
from users import fetch_users
from gliders import fetch_gliders, Weighing
from weighing_sheet import display_detail_weighing

logger = logging.getLogger(__name__)

def handle_button_state(action):
	pass

def weihging_added(current_glider):
	for row in st.session_state.weighing_edit['added_rows']:
		date = datetime.strptime(row['date'], '%Y-%m-%d').date() if 'date' in row.keys() else datetime.now().date()
		p1 = row['p1'] if 'p1' in row.keys() else 0.0
		p2 = row['p2'] if 'p2' in row.keys() else 0.0
		A = row['A'] if 'A' in row.keys() else 0
		D = row['D'] if 'D' in row.keys() else 0
		right_wing_weight = row['right_wing_weight'] if 'right_wing_weight' in row.keys() else 0.0
		left_wing_weight = row['left_wing_weight'] if 'left_wing_weight' in row.keys() else 0.0
		tail_weight = row['tail_weight'] if 'tail_weight' in row.keys() else 0.0
		fuselage_weight = row['fuselage_weight'] if 'fuselage_weight' in row.keys() else 0.0
		fix_ballast_weight = row['fix_ballast_weight'] if 'fix_ballast_weight' in row.keys() else 0.0
		new_weighing = Weighing(None, date, p1, p2, right_wing_weight, left_wing_weight, tail_weight, fuselage_weight, fix_ballast_weight, A, D)
		current_glider.weighings.append(new_weighing)
	current_glider.save_weighings()

	st.success ('Pesée(s) ajoutée(s) avec succès', icon=':material/check_circle:')
	logger.debug('weighing(s) added, the list of weighing is now {}'.format(current_glider.weighings))
	return True

def weihging_edited(current_glider):
	for key, value in st.session_state.weighing_edit['edited_rows'].items():
		# row_to_update = edited_wheighings_df.iloc[key]
		row_to_update = edited_wheighings_df.loc[key]
		weighing_to_update = current_glider.get_weighing_by_id(row_to_update['id'])
		if weighing_to_update is not None:
			weighing_to_update.date = row_to_update['date']
			weighing_to_update.p1 = row_to_update['p1']
			weighing_to_update.p2 = row_to_update['p2']
			weighing_to_update.right_wing_weight = row_to_update['right_wing_weight']
			weighing_to_update.left_wing_weight = row_to_update['left_wing_weight']
			weighing_to_update.tail_weight = row_to_update['tail_weight']
			weighing_to_update.fuselage_weight = row_to_update['fuselage_weight']
			weighing_to_update.fix_ballast_weight = row_to_update['fix_ballast_weight']
			weighing_to_update.A = int(row_to_update['A'])
			weighing_to_update.D = int(row_to_update['D'])
	current_glider.save_weighings()

	st.success ('Données modifiées sauvegardées avec succès', icon=':material/check_circle:')
	logger.debug('weighing(s) modified, the list of weighing is now {}'.format(current_glider.weighings))
	return True	

def weihging_deleted(current_glider):
	weighings_to_delete = [ current_glider.weighings[value] for value in st.session_state.weighing_edit['deleted_rows']]
	for weighing in weighings_to_delete:
		weighing.delete()
		current_glider.weighings.remove(weighing)

	st.success ('Pesée(s) supprimée(s) avec succès', icon=':material/check_circle:')
	logger.debug('weighing(s) deleted, the list of weighing is now {}'.format(current_glider.weighings))
	return True

logger.debug('START weighing_ui.py')
st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon='✈️',
	layout='wide',
	# initial_sidebar_state='expanded'
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header(':material/balance: Peser planeur')
	gliders = fetch_gliders()
	users = fetch_users()
	sidebar_menu(users)

	# Init button menu state and other value in session state
	if ('selected_registration' not in st.session_state):
		st.session_state.selected_registration = ''

	# display a select box for glider selection
	gliders_options = list(gliders.keys())
	selected_registration = st.selectbox('Choisir un planeur', gliders.keys(), 
		index=gliders_options.index(st.session_state.selected_registration) if st.session_state.selected_registration in gliders_options else 0,
		on_change=handle_button_state, args=('select', ))
	st.session_state.selected_registration = selected_registration
	current_glider = gliders.get(selected_registration)

	if (current_glider is not None):
		# displag weighings for the selectd glider
		st.subheader('Liste des pesées précédentes pour ce planeur')
			
		wheighings_df = current_glider.wheighings_to_pandas()
		with st.form('weighing-form'):
			edited_wheighings_df = st.data_editor(wheighings_df, key="weighing_edit", use_container_width=True, num_rows='dynamic', 
				disabled=True if st.session_state.get('FormSubmitter:weighing-form-Enregistrer') else False,
				column_order=['date', 'p1', "p2",  "A", "D", "right_wing_weight", "left_wing_weight", "tail_weight", "fuselage_weight", "fix_ballast_weight"],
				column_config={
					'date': st.column_config.DateColumn(label="Date", format='DD-MM-YYYY'),
					'p1': st.column_config.NumberColumn(label='P1 (kg)', step=0.1, format='%0.1f'),
					'p2': st.column_config.NumberColumn(label='P2 (kg)', step=0.1, format='%0.1f'),
					'A': st.column_config.NumberColumn(label='A (mm)', step=1, format='%d'), 
					'D':  st.column_config.NumberColumn(label='D (mm)', step=1, format='%d'), 
					'right_wing_weight':  st.column_config.NumberColumn(label='Aile droite (kg)', step=0.1, format='%.1f'),
					'left_wing_weight': st.column_config.NumberColumn(label='Aile gauche (kg)', step=0.1, format='%.1f'),
					'tail_weight':  st.column_config.NumberColumn(label='Empennage H (kg)', step=0.1, format='%.1f'),
					'fuselage_weight':  st.column_config.NumberColumn(label='Fuselage (kg)', step=0.1, format='%.1f'),
					'fix_ballast_weight':  st.column_config.NumberColumn(label='Masse du lest fixe (kg)', step=0.1, format='%.1f'),
				})
			submitted = st.form_submit_button("Enregistrer", icon=':material/save:',disabled= True if st.session_state.get('FormSubmitter:weighing-form-Enregistrer') else False)

		if submitted or st.session_state.get('FormSubmitter:weighing-form-Enregistrer'):
			cache_to_refresh = False

			# weighing added
			if len (st.session_state.weighing_edit['added_rows']) > 0:
				cache_to_refresh = weihging_added(current_glider)

			# weighing edited
			if len (st.session_state.weighing_edit['edited_rows']) > 0:
				cache_to_refresh = weihging_edited(current_glider)

			# weighing deleted
			if len (st.session_state.weighing_edit['deleted_rows']) > 0:
				cache_to_refresh = weihging_deleted(current_glider)

			# refresh cache and rerun if the list of weighing have been updated
			if cache_to_refresh:
				logger.debug('Force clear cache')
				st.cache_data.clear()
			else:
				st.warning('Aucun enregistrement a sauvegarder/effacer, vérifiez qu\'un des champs dans le tableau ne soit pas en erreur', icon=':material/warning:')

			if st.session_state.get('FormSubmitter:weighing-form-Enregistrer'):	
				st.button('Ok')
				st.session_state.pop('FormSubmitter:weighing-form-Enregistrer')
				st.session_state.pop('weighing_edit')

		st.divider()
		selected_weighing = st.selectbox('Sélectionner une pesée', current_glider.weighings, 
			format_func=lambda weighings: 'pesée #{} du {}'.format(weighings.id, weighings.date.strftime('%d/%m/%Y')))
		if (selected_weighing is not None):
			display_detail_weighing(selected_weighing, current_glider, True)
		
	else:
		st.warning('Aucun planeur sélectionné', icon=':material/warning:')
		
# st.write(st.session_state)
logger.debug('END weighing_ui.py')


