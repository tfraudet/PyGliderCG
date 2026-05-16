import pandas as pd
import streamlit as st
import logging
import re
from typing import Any, Dict

from config import FAVICON_WEB
from pages.sidebar import sidebar_menu
from backend_client import BackendClient, ForbiddenError, NotFoundError, BackendException
from enum import Enum
from gliders import get_datum_image_by_label, DATUMS

from gliders import DatumPilotPosition as Dpp

logger = logging.getLogger(__name__)

submitted = False
client = BackendClient()

class ModeEdition(Enum):
	EDIT = 1
	NEW = 2

def is_valid_registration(input_string):
	# Define the pattern: one alphanumeric character, a dash, then four alphanumeric characters
	# pattern = r'^[A-Z0-9]-[A-Z0-9]{4}$'

	# Define the pattern: one alphanumeric character, a dash, then four alphanumeric characters
	# or one alphanumeric character, a dash, then four alphanumeric characters, a forward slash, one or more digits, and the letter 'm'	
	pattern = r'^[A-Za-z0-9]-[A-Za-z0-9]{4}(?:/[0-9]+m)?$'
	match = re.match(pattern, input_string)
	return bool(match)

def edit_glider_datasheet(glider_data: dict, mode = ModeEdition.EDIT):	
	col1, col2 = st.columns(2)
	with col1:
		registration = st.text_input('Immatriculation', value=glider_data.get('registration', ''), disabled= True if mode == ModeEdition.EDIT else False)
		serial_number = st.text_input('Numéro de série', value=glider_data.get('serial_number', ''))
		single_seat = st.checkbox("Monoplace", value = glider_data.get('single_seat', True))
	with col2:
		model = st.text_input('Modèle', value=glider_data.get('model', ''))
		brand  = st.text_input('Marque', value=glider_data.get('brand', ''))

	st.divider()
	st.subheader("Référence de pesée")

	datum_labels = [datum['label'] for datum in DATUMS.values()]
	current_datum = glider_data.get('datum', 1)
	datum_and_weighing_points_position = st.selectbox('Plan de référence et type d\'appui',datum_labels, index=current_datum-1)
	col1, col2 = st.columns(2)
	with col1:
		image_path = get_datum_image_by_label(datum_and_weighing_points_position)
		if image_path:
			st.image(image_path, width='stretch')
		pilot_position_text = 'En avant de la référence' if glider_data.get('pilot_position', 1) == 1 else 'En arrière de la référence'
		pilote_position = st.radio('Position du pilote', options=['En avant de la référence', 'En arrière de la référence'], index=0 if pilot_position_text == 'En avant de la référence' else 1)

	with col2:
		datum_text = st.text_input('Plan de référence', placeholder='Bord d\'attaque à l\'emplature de l\'aile', value=glider_data.get('datum_label', ''))	
		wedge = st.text_input('Cale de référence', placeholder='45/1000', value=glider_data.get('wedge', ''))
		wedge_position = st.text_input('Position de la cale de référence',placeholder='Dessus du fuselage entre aile et dérive', value=glider_data.get('wedge_position', ''))
	
	st.divider()
	st.subheader("Limites de masse et bras de leviers")
	col1, col2 = st.columns(2)
	
	limits = glider_data.get('limits', {})
	arms = glider_data.get('arms', {})
	
	with col1:
		st.write("Limitations de masse")
		with st.container(border=True):
			limits_mmwp = st.number_input('MMWP (kg)', format='%0.1f', step=0.5, value = limits.get('mmwp', 0.0), help='Masse maximal ou masse maximal water ballast plein')
			limits_mmwv = st.number_input('MMWV (kg)', format='%0.1f', step=0.5, value = limits.get('mmwv', 0.0), help='Masse maximal water ballast vide ou masse maximal si pas de water ballast')
			limits_mmenp = st.number_input('MMENP (kg)', format='%0.1f', step=0.5, value = limits.get('mmenp', 0.0), help='Masse maximale des éléments non portants')
			limits_mm_harnais = st.number_input('MMHarnais (kg)', format='%0.1f', step=0.5, value = limits.get('mm_harnais', 0.0), help='Masse maximale d\'utilisation du harnais')
			limits_weight_min_pilot = st.number_input('Masse mini pilote (kg)', format='%0.1f', step=0.5, value = limits.get('weight_min_pilot', 0.0), help='Masse mini du pilote')

		st.write("Limites de centrage")
		with st.container(border=True):
			centrage_avant = st.number_input('Centrage avant (mm)', format='%0.0f', step=1.0, value=limits.get('front_centering', 0.0), help='Limite de centrage avant')
			centrage_arriere = st.number_input('Centrage arrière (mm)',  format='%0.0f', step=1.0, value=limits.get('rear_centering', 0.0),help='Limite de centrage arrière' )
	with col2:
		st.write("Bras de leviers")
		with st.container(border=True):
			arm_front_pilot = st.number_input('Bras de levier pilote avant(mm)', format='%0.0f', step=1.0, value=arms.get('arm_front_pilot', 0.0))
			arm_rear_pilot = st.number_input('Bras de levier pilote arrière (mm)', format='%0.0f', step=1.0, value=arms.get('arm_rear_pilot', 0.0))
			arm_waterballast = st.number_input('Bras de levier waterballast (mm)', format='%0.0f', step=1.0, value=arms.get('arm_waterballast', 0.0))
			arm_front_ballast = st.number_input('Bras de levier gueuse avant (mm)', format='%0.0f', step=1.0, value=arms.get('arm_front_ballast', 0.0))
			arm_rear_watterballast_or_ballast = st.number_input('Bras de levier ballast ou gueuse arrière (mm)', format='%0.0f', step=1.0, value=arms.get('arm_rear_watterballast_or_ballast', 0.0))
			arm_instruments_panel = st.number_input('Bras de levier tableau de bord (mm)', format='%0.0f', step=1.0, value=arms.get('arm_instruments_panel', 0.0))

	st.divider()
	save_glider_datasheet = st.button('Enregistrer', icon=':material/save:')
	if save_glider_datasheet:
		selected_datum = next(filter(lambda item: item[1]['label'] == datum_and_weighing_points_position, DATUMS.items()), None)
		if selected_datum is None:
			st.error('Référence de pesée invalide', icon=':material/error:')
			return
		datum_value = selected_datum[0].value
		pilot_position_value = Dpp.PILOT_FORWARD_OF_DATUM.value if pilote_position == 'En avant de la référence' else Dpp.PILOT_AFT_OF_DATUM.value		

		glider_update = {
			'registration': registration,
			'model': model,
			'brand': brand,
			'serial_number': serial_number,
			'single_seat': single_seat,
			'datum': datum_value,
			'datum_label': datum_text,
			'wedge': wedge,
			'wedge_position': wedge_position,
			'pilot_position': pilot_position_value,
			'limits': {
				'mmwp': limits_mmwp,
				'mmwv': limits_mmwv,
				'mmenp': limits_mmenp,
				'mm_harnais': limits_mm_harnais,
				'weight_min_pilot': limits_weight_min_pilot,
				'front_centering': centrage_avant,
				'rear_centering': centrage_arriere,
			},
			'arms': {
				'arm_front_pilot': arm_front_pilot,
				'arm_rear_pilot': arm_rear_pilot,
				'arm_waterballast': arm_waterballast,
				'arm_front_ballast': arm_front_ballast,
				'arm_rear_watterballast_or_ballast': arm_rear_watterballast_or_ballast,
				'arm_instruments_panel': arm_instruments_panel,
			}
		}
	
		if mode == ModeEdition.NEW:
			if not is_valid_registration(glider_update['registration']):
				st.error('Le numero de registration n\'est pas valide, il doit être de la forme x-xxxx ou x-xxxx/yym, avec x représentant un caractère alphanumérique (majuscule uniquement), et yy l\'envergure', icon=':material/error:')
			else:
				logger.debug('Create glider {} via backend'.format(glider_update['registration']))
				result = client.create_glider(glider_update)
				if result:
					st.success('Planeur {}, modèle {} de la marque {} créé avec succès '.format(glider_update['registration'], glider_update['model'], glider_update['brand']), icon=':material/check_circle:')
					logger.debug('Force rerun and set selected_registration to {} in the session'.format(glider_update['registration']))
					st.session_state.selected_registration = glider_update['registration']
					st.rerun(scope='app')
		else:
			logger.debug('Update glider {} via backend'.format(glider_update['registration']))
			result = client.update_glider(glider_update['registration'], glider_update)
			if result:
				st.success('Planeur {}, modèle {}, marque {} mis à jour avec succès '.format(glider_update['registration'], glider_update['model'], glider_update['brand']), icon=':material/check_circle:')
				logger.debug('Update glider {} datasheet on backend'.format(glider_update['registration']))
			
def edit_glider_inventory(glider_data: dict, mode = ModeEdition.EDIT):	
	form_name = 'edit-inventory' if mode == ModeEdition.EDIT else 'add-inventory'
	
	instruments = glider_data.get('instruments', [])
	inventory_df = pd.DataFrame(instruments) if instruments else pd.DataFrame(columns=['id', 'on_board', 'instrument', 'brand', 'type', 'number', 'date', 'seat'])
	
	with st.form(form_name, border=False):
		edited_inventory_df = st.data_editor(inventory_df, width='stretch', key="inventory_edit", hide_index=True, num_rows='dynamic',
			column_config={
				'id' : {'hidden': True},
				"on_board": st.column_config.CheckboxColumn(label="Installé", help='Coché si l\'instrument est en place au moment de la pesée'),
				"instrument": "Instrument",
				"brand": "Marque",
				"type": "Type",
				"number": "N°",
				'date':  st.column_config.DateColumn(label="Date"),
				"seat" : st.column_config.SelectboxColumn(
						label="Où",
						help="Instrument installé a l'avant ou a l'arrière",
						options=[
							'',
							'AV',
							'AR',
						],
						default='',
					),
			}
		)

		submitted = st.form_submit_button("Enregistrer")

	if submitted:
		equipment_to_save = []
		
		if len (st.session_state.inventory_edit['added_rows']) > 0:
			st.info ('Ajout d\'équipement(s)', icon=':material/info:')
			for row in st.session_state.inventory_edit['added_rows']:
				on_board = row.get('on_board', False)
				instrument = row.get('instrument', '')
				brand = row.get('brand', '')
				type_val = row.get('type', '')
				number = row.get('number', '')
				date = row.get('date', None)
				seat = row.get('seat', '')
				equipment_to_save.append({
					'on_board': on_board,
					'instrument': instrument,
					'brand': brand,
					'type': type_val,
					'number': number,
					'date': str(date) if date else None,
					'seat': seat
				})

		if len (st.session_state.inventory_edit['edited_rows']) > 0:
			st.info ('Sauvegarde des données équipements modifiés', icon=':material/info:')
			for key, _value in st.session_state.inventory_edit['edited_rows'].items():
				row_to_update = edited_inventory_df.iloc[key]
				equipment_to_save.append({
					'id': row_to_update.get('id'),
					'on_board': row_to_update['on_board'],
					'instrument': row_to_update['instrument'],
					'brand': row_to_update['brand'],
					'type': row_to_update['type'],
					'number': row_to_update['number'],
					'date': str(row_to_update['date']) if row_to_update.get('date') else None,
					'seat': row_to_update['seat']
				})

		if len (st.session_state.inventory_edit['deleted_rows']) > 0:
			st.info ('Suppression d\'équipement(s)', icon=':material/info:')

		if equipment_to_save or len(st.session_state.inventory_edit['deleted_rows']) > 0:
			try:
				remaining_equipment: list[Dict[str, Any]] = [
					{str(k): v for k, v in e.items()} for i, e in enumerate(inventory_df.to_dict('records'))
					if i not in st.session_state.inventory_edit['deleted_rows']]
				remaining_equipment.extend(equipment_to_save)
				result = client.update_glider_inventory(glider_data['registration'], remaining_equipment)
				if result:
					logger.debug('update glider {} inventory on backend'.format(glider_data['registration']))
					st.success('Inventaire du planeur {} mis à jour avec succès '.format(glider_data['registration']), icon=':material/check_circle:')
			except Exception as e:
				st.error(f'Error updating inventory: {str(e)}')
				logger.error(f'Error updating inventory: {e}')

def edit_glider_weight_and_balance(glider_data: dict):
	st.write('Valeur constructeur masse/centrage')
	with st.form('edit-weight-balance', border=False):
		w_and_b = glider_data.get('weight_and_balances', [])
		w_and_b_df = pd.DataFrame(w_and_b, columns=['balance', 'weight']) if w_and_b else pd.DataFrame(columns=['balance', 'weight'])
		
		edited_w_and_b = st.data_editor(w_and_b_df, width='stretch', key="wandb_edit", hide_index=True, num_rows='dynamic',
			column_config={
				'balance' : st.column_config.NumberColumn(
					label='Centrage (mm)',
					format='%d',
					default=0,
				),
				'weight' : st.column_config.NumberColumn(
					label='Masse (kg)',
					format='%0.1f',
					default=0.0,
				)
			}
		)

		submitted = st.form_submit_button("Enregistrer", icon=':material/save:')

	if submitted:
		updated_w_and_b = []

		if len (st.session_state.wandb_edit['added_rows']) > 0:
			st.info ('Ajout de point(s)', icon=':material/info:')
			for row in st.session_state.wandb_edit['added_rows']:
				balance = row.get('balance', 0)
				weight = round(row.get('weight', 0.0), 1)
				updated_w_and_b.append([balance, weight])

		if len (st.session_state.wandb_edit['edited_rows']) > 0:
			st.info ('Sauvegarde des points modifiés', icon=':material/info:')
			for key, _value in st.session_state.wandb_edit['edited_rows'].items():
				row_to_update = edited_w_and_b.iloc[key]
				updated_w_and_b.append([row_to_update['balance'], row_to_update['weight']])

		if len (st.session_state.wandb_edit['deleted_rows']) > 0:
			st.info ('Suppression de point(s)', icon=':material/info:')

		try:
			result = client.update_glider_weight_and_balances(glider_data['registration'], updated_w_and_b)
			if result:
				logger.debug('update glider {} weight and center of gravity points on backend'.format(glider_data['registration']))
				st.success('Points masse & centrage du planeur {} mis à jour avec succès '.format(glider_data['registration']), icon=':material/check_circle:')
		except Exception as e:
			st.error(f'Error updating weight and balance: {str(e)}')
			logger.error(f'Error updating weight and balance: {e}')

def edit_glider(glider_registration):
	with glider_placeholder:
		with st.container(): 
			try:
				glider_data = client.get_glider(glider_registration)
				if not glider_data:
					st.error(f'Planeur {glider_registration} non trouvé', icon=':material/error:')
					return

				st.info('Modification du planeur {}'.format(glider_registration), icon=':material/info:')

				tab1, tab2, tab3 = st.tabs(['Fiche planeur', 'Equipements', 'Masse/centrage'])
				with tab1:
					edit_glider_datasheet(glider_data, ModeEdition.EDIT)
				with tab2:
					edit_glider_inventory(glider_data, ModeEdition.EDIT)
				with tab3:
					edit_glider_weight_and_balance(glider_data)
			except ForbiddenError:
				st.error('Vous n\'avez pas les permissions nécessaires pour modifier ce planeur', icon=':material/error:')
			except BackendException as e:
				st.error(f'Erreur lors de la récupération du planeur: {str(e)}', icon=':material/error:')

def delete_glider(glider_registration):
	with glider_placeholder:
		try:
			if client.delete_glider(glider_registration):
				st.session_state.flash_success = 'Planeur {} effacé avec succès !'.format(glider_registration)
				st.session_state.selected_registration = ''
				st.rerun(scope='app')
		except ForbiddenError:
			st.error('Vous n\'avez pas les permissions nécessaires pour supprimer ce planeur', icon=':material/error:')
		except NotFoundError:
			st.error(f'Planeur {glider_registration} non trouvé', icon=':material/error:')
		except BackendException as e:
			st.error(f'Erreur lors de la suppression du planeur: {str(e)}', icon=':material/error:')

def new_glider():
	with glider_placeholder:
		with st.container(): 
			glider_data = {
				'model': '',
				'registration': 'TBD',
				'brand': '',
				'serial_number': '',
				'single_seat': True,
				'datum': 1,
				'datum_label': '',
				'pilot_position': 1,
				'wedge': '',
				'wedge_position': '',
				'limits': {
					'mmwp': 0.0,
					'mmwv': 0.0,
					'mmenp': 0.0,
					'mm_harnais': 0.0,
					'weight_min_pilot': 0.0,
					'front_centering': 0.0,
					'rear_centering': 0.0,
				},
				'arms': {
					'arm_front_pilot': 0.0,
					'arm_rear_pilot': 0.0,
					'arm_waterballast': 0.0,
					'arm_front_ballast': 0.0,
					'arm_rear_watterballast_or_ballast': 0.0,
					'arm_instruments_panel': 0.0,
				}
			}

			st.info('Ajout d\'un nouveau planeur', icon=':material/info:')
			edit_glider_datasheet(glider_data, ModeEdition.NEW)

def display_glider():
	with glider_placeholder:
		st.info('Display gliders !', icon=':material/info:')
		try:
			gliders_list = client.get_gliders()
			if gliders_list:
				rows = [ {
					'registration': glider.get('registration', ''),
					'model': glider.get('model', ''),
					'brand': glider.get('brand', ''),
					'serial_number': glider.get('serial_number', ''),
					'single_seat': glider.get('single_seat', False),
				} for glider in gliders_list]
				st.dataframe(rows, width='stretch')
			else:
				st.info('Aucun planeur trouvé', icon=':material/info:')
		except BackendException as e:
			st.error(f'Erreur lors de la récupération des planeurs: {str(e)}', icon=':material/error:')

def handle_button_state(boutton):
	logger.debug('handle_button_state() is call by button {}'.format(boutton))

	if boutton in ('delete, list'):
		st.session_state.btn_edit_state = False
		st.session_state.btn_add_state = False

	if boutton == 'add':
		st.session_state.btn_edit_state = False
		st.session_state.btn_add_state = True

	if boutton == 'edit':
		st.session_state.btn_edit_state = True
		st.session_state.btn_add_state = False

logger.debug('START glider_ui.py')
st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon=FAVICON_WEB,
	layout='wide',
	# initial_sidebar_state='expanded'
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header('Gestion des planeurs')

	# Display flash messages from previous actions
	if 'flash_success' in st.session_state and st.session_state.flash_success:
		st.success(st.session_state.flash_success, icon=':material/check_circle:')
		del st.session_state.flash_success

	sidebar_menu()

	try:
		gliders_data = client.get_gliders()
		gliders_dict = {glider['registration']: glider for glider in gliders_data} if gliders_data else {}
	except BackendException as e:
		st.error(f'Erreur lors de la connexion au backend: {str(e)}', icon=':material/error:')
		logger.error(f'Backend error: {e}')
		gliders_dict = {}

	# Init button menu state and other value in session state
	if 'btn_edit_state' not in st.session_state:
		st.session_state.btn_edit_state = False
	if 'btn_add_state' not in st.session_state:
		st.session_state.btn_add_state = False
	if ('selected_registration' not in st.session_state):
		st.session_state.selected_registration = ''

	# Build menu
	col1, col2 =  st.columns(2,vertical_alignment='center', )
	selected_registration = ''
	with col1:
		with st.container(border=True,height=100):
			sub_col1, sub_col2, sub_col3 = st.columns(3,vertical_alignment='center',)
			with sub_col1:
				gliders_options = list(gliders_dict.keys())
				if gliders_options:
					selected_registration = st.selectbox('Choisir un planeur', gliders_options, index=gliders_options.index(st.session_state.selected_registration) if st.session_state.selected_registration in gliders_options else 0)
					st.session_state.selected_registration = selected_registration
				else:
					st.info('Aucun planeur disponible', icon=':material/info:')
			with sub_col2:
				btn_edit = st.button('L\'editer',icon=':material/edit:', on_click=handle_button_state, args=('edit', ))
			with sub_col3:
				btn_delete = st.button('L\'effacer', icon=':material/delete:', on_click=handle_button_state, args=('delete', ))
	with col2:
		with st.container(border=True, height=100):
			sub_col1, sub_col2 = st.columns(2,vertical_alignment='center',)

			with sub_col1: 
				btn_display = st.button('Lister les planeurs',icon=':material/table_view:', on_click=handle_button_state, args=('list', ))
			with sub_col2: 
				btn_add = st.button('Ajouter un planeur',icon=':material/add:',on_click=handle_button_state, args=('add', ))

	# main part of the screen
	glider_placeholder = st.empty()

	# Handle actions
	if btn_edit or st.session_state.btn_edit_state:
		if selected_registration is not None and selected_registration != '':
			edit_glider(selected_registration)
		else:
			st.warning('Aucun planeur sélectionné',icon=':material/warning:')

	if btn_delete:
		if selected_registration is not None and selected_registration != '':
			delete_glider(selected_registration)
		else:
			st.warning('Aucun planeur sélectionné',icon=':material/warning:')

	if btn_display:
		display_glider()

	if btn_add or st.session_state.btn_add_state:
		new_glider()

logger.debug('END glider_ui.py')
