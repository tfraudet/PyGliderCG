import pandas as pd
import streamlit as st
import logging
import re

from pages.sidebar import sidebar_menu
from users import fetch_users
from gliders import Instrument, fetch_gliders, Glider, Limits, Arms
from enum import Enum
from gliders import get_datum_image_by_label, DATUMS

from gliders import DatumWeighingPoints as Dwp
from gliders import DatumPilotPosition as Dpp

logger = logging.getLogger(__name__)

submitted = False

class ModeEdition(Enum):
	EDIT = 1
	NEW = 2

def is_valid_registration(input_string):
	# Define the pattern: one alphanumeric character, a dash, then four alphanumeric characters
	pattern = r'^[A-Z0-9]-[A-Z0-9]{4}$'
	match = re.match(pattern, input_string)
	return bool(match)

def edit_glider_datasheet(glider : Glider, mode = ModeEdition.EDIT):	
	col1, col2 = st.columns(2)
	with col1:
		registration = st.text_input('Immatriculation', value=glider.registration, disabled= True if mode == ModeEdition.EDIT else False)
		serial_number = st.text_input('Numéro de série', value=glider.serial_number)
		single_seat = st.checkbox("Monoplace", value = glider.single_seat)
	with col2:
		model = st.text_input('Modèle', value=glider.model)
		brand  = st.text_input('Marque', value=glider.brand)

	st.divider()
	st.subheader("Référence de pesée")

	datum_labels = [datum['label'] for datum in DATUMS.values()]
	datum_and_weighing_points_position = st.selectbox('Plan de référence et type d\'appui',datum_labels, index=glider.datum-1)
	col1, col2 = st.columns(2)
	with col1:
		st.image(get_datum_image_by_label(datum_and_weighing_points_position), use_container_width=True)
		pilote_position = st.radio('Position du pilote', options=['En avant de la référence', 'En arrière de la référence'], index=glider.pilot_position-1)

	with col2:
		datum_text = st.text_input('Plan de référence', placeholder='Bord d\'attaque à l\'emplature de l\'aile', value=glider.datum_label)	
		wedge = st.text_input('Cale de référence', placeholder='45/1000', value=glider.wedge)
		wedge_position = st.text_input('Position de la cale de référence',placeholder='Dessus du fuselage entre aile et dérive', value=glider.wedge_position)
	
	st.divider()
	st.subheader("Limites de masse et bras de leviers")
	col1, col2 = st.columns(2)
	with col1:
		st.write("Limitations de masse")
		with st.container(border=True):
			limits_mmwp = st.number_input('MMWP (kg)', format='%0.1f', step=0.5, value = glider.limits.mmwp, help='Masse maximal ou masse maximal water ballast plein')
			limits_mmwv = st.number_input('MMWV (kg)', format='%0.1f', step=0.5, value = glider.limits.mmwv, help='Masse maximal water ballast vide ou masse maximal si pas de water ballast')
			limits_mmenp = st.number_input('MMENP (kg)', format='%0.1f', step=0.5, value = glider.limits.mmenp, help='Masse maximale des éléments non portants')
			limits_mm_harnais = st.number_input('MMHarnais (kg)', format='%0.1f', step=0.5, value = glider.limits.mm_harnais, help='Masse maximale d\'utilisation du harnais')
			limits_weight_min_pilot = st.number_input('Masse mini pilote (kg)', format='%0.1f', step=0.5, value = glider.limits.weight_min_pilot, help='Masse mini du pilote')

		st.write("Limites de centrage")
		with st.container(border=True):
			centrage_avant = st.number_input('Centrage avant (mm)', format='%0.0f', step=1.0, value=glider.limits.front_centering, help='Limite de centrage avant')
			centrage_arriere = st.number_input('Centrage arrière (mm)',  format='%0.0f', step=1.0, value=glider.limits.rear_centering,help='Limite de centrage arrière' )
	with col2:
		st.write("Bras de leviers")
		with st.container(border=True):
			arm_front_pilot = st.number_input('Bras de levier pilote avant(mm)', format='%0.0f', step=1.0, value=glider.arms.arm_front_pilot)
			arm_rear_pilot = st.number_input('Bras de levier pilote arrière (mm)', format='%0.0f', step=1.0, value=glider.arms.arm_rear_pilot)
			arm_waterballast = st.number_input('Bras de levier waterballast (mm)', format='%0.0f', step=1.0, value=glider.arms.arm_waterballast)
			arm_front_ballast = st.number_input('Bras de levier gueuse avant (mm)', format='%0.0f', step=1.0, value=glider.arms.arm_front_ballast)
			arm_rear_watterballast_or_ballast = st.number_input('Bras de levier ballast ou gueuse arrière (mm)', format='%0.0f', step=1.0, value=glider.arms.arm_rear_watterballast_or_ballast)
			# arm_gas_tank = st.number_input('Bras de levier réservoir essence (mm)', format='%0.0f', step=1.0, value=glider.arms.arm_gas_tank)
			arm_instruments_panel = st.number_input('Bras de levier tableau de bord (mm)', format='%0.0f', step=1.0, value=glider.arms.arm_instruments_panel)

	st.divider()
	save_glider_datasheet = st.button('Enregistrer', icon=':material/save:')
	if save_glider_datasheet:
		cache_to_refresh = False
		glider.registration = registration
		glider.model = model
		glider.brand = brand
		glider.serial_number = serial_number
		glider.single_seat =  single_seat

		glider.datum = next(filter(lambda item: item[1]['label'] == datum_and_weighing_points_position, DATUMS.items()), None)[0].value
		glider.datum_label = datum_text
		glider.wedge = wedge
		glider.wedge_position = wedge_position
		glider.pilot_position = Dpp.PILOT_FORWARD_OF_DATUM.value if pilote_position == 'En avant de la référence' else Dpp.PILOT_AFT_OF_DATUM.value		

		glider.limits.mmwp = limits_mmwp
		glider.limits.mmwv = limits_mmwv
		glider.limits.mmenp = limits_mmenp
		glider.limits.mm_harnais = limits_mm_harnais
		glider.limits.weight_min_pilot = limits_weight_min_pilot
		glider.limits.front_centering = centrage_avant
		glider.limits.rear_centering = centrage_arriere

		glider.arms.arm_front_pilot	= arm_front_pilot
		glider.arms.arm_rear_pilot	= arm_rear_pilot
		glider.arms.arm_waterballast = arm_waterballast
		glider.arms.arm_front_ballast = arm_front_ballast
		glider.arms.arm_rear_watterballast_or_ballast = arm_rear_watterballast_or_ballast
		# glider.arms.arm_gas_tank = arm_gas_tank
		glider.arms.arm_instruments_panel = arm_instruments_panel
	
		if mode == ModeEdition.NEW:
			if not is_valid_registration(glider.registration):
				st.error('Le numero de registration n\'est pas valide, il doit être de la forme x-xxxx, avec x représentant un caractère alphanumérique, majuscule uniquement.', icon=':material/error:')
			else:
				logger.info('Create glider {} datasheet on database'.format(glider.registration))
				glider.save()
				cache_to_refresh = True
				st.success('Planeur {}, modèle {} de la marque {} créé avec succès '.format(glider.registration, glider.model, glider.brand), icon=':material/check_circle:')
		else:
			glider.save()
			cache_to_refresh = True

			st.success('Planeur {}, modèle {}, marque {} mis à jour avec succès '.format(glider.registration, glider.model, glider.brand), icon=':material/check_circle:')
			logger.info('Update glider {} datasheet on database'.format(glider.registration))

		# refresh cache and rerun if the glider has been updated
		if cache_to_refresh:
			logger.info('Force clear cache')
			st.cache_data.clear()

			if mode == ModeEdition.NEW:
				logger.info('Force rerun and set selected_registration to {} in the session'.format(glider.registration))
				st.session_state.selected_registration = glider.registration
				st.rerun(scope='app')
			
def edit_glider_inventory(glider : Glider, mode = ModeEdition.EDIT):	
	form_name = 'edit-inventory' if mode == ModeEdition.EDIT else 'add-inventory'
	with st.form(form_name, border=False):
		# display equipements installed
		inventory_df = glider.instruments_to_pandas()
		edited_inventory_df = st.data_editor(inventory_df, use_container_width=True, key="inventory_edit", hide_index=True, num_rows='dynamic',
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
		cache_to_refresh = False
		# equipements added
		if len (st.session_state.inventory_edit['added_rows']) > 0:
			st.info ('Ajout d\'équipement(s)', icon=':material/info:')
			for row in st.session_state.inventory_edit['added_rows']:
				on_board = row['on_board'] if 'on_board' in row.keys() else False
				instrument = row['instrument'] if 'instrument' in row.keys() else ''
				brand = row['brand'] if 'brand' in row.keys() else ''
				type = row['type'] if 'type' in row.keys() else ''
				number = row['number'] if 'number' in row.keys() else ''
				date = row['date'] if 'date' in row.keys() else None
				seat = row['seat'] if 'seat' in row.keys() else ''
				equipment = Instrument(None, on_board, instrument, brand, type, number, date, seat)
				glider.instruments.append(equipment)
			logger.info('equipement(s) added, the inventory is now {}'.format(glider.instruments))
			glider.save_instruments()
			cache_to_refresh = True

		# equipements edited, id and registration are not editable
		if len (st.session_state.inventory_edit['edited_rows']) > 0:
			st.info ('Sauvegarde des données équipements modifiés', icon=':material/info:')
			for key, value in st.session_state.inventory_edit['edited_rows'].items():
				row_to_update = edited_inventory_df.iloc[key]
				instrument_to_update = glider.get_instrument_by_id(row_to_update['id'])
				if instrument_to_update is not None:
					instrument_to_update.on_board = bool(row_to_update['on_board'])
					instrument_to_update.instrument = row_to_update['instrument']
					instrument_to_update.brand = row_to_update['brand']
					instrument_to_update.type = row_to_update['type']
					instrument_to_update.number = row_to_update['number']
					instrument_to_update.date = row_to_update['date']
					instrument_to_update.seat = row_to_update['seat']
			logger.info('equipement(s) modified in the inventory {}'.format(glider.instruments))
			glider.save_instruments()
			cache_to_refresh = True

		# equipements deleted
		if len (st.session_state.inventory_edit['deleted_rows']) > 0:
			st.info ('Suppression d\'équipement(s)', icon=':material/info:')
			instruments_to_delete = [ glider.instruments[value] for value in st.session_state.inventory_edit['deleted_rows']]
			for instrument in instruments_to_delete:
				instrument.delete()
				glider.instruments.remove(instrument)
			logger.info('equipement(s) deleted, the inventory is now {}'.format(glider.instruments))
			cache_to_refresh = True

		logger.info('update glider {} inventory on database'.format(glider.registration))
		st.success('Inventaire du planeur {} mis à jour avec succès '.format(glider.registration), icon=':material/check_circle:')

		# refresh the cache if the list of equipements have been updated
		if cache_to_refresh:
			logger.info('Force clear cache')
			st.cache_data.clear()

def edit_glider_weight_and_balance(glider : Glider):
	st.write('Valeur constructeur masse/centrage')
	with st.form('edit-weight-balance', border=False):
		w_and_b_df = glider.weight_and_balances_to_pandas()
		edited_w_and_b = st.data_editor(w_and_b_df, use_container_width=True, key="wandb_edit", hide_index=True, num_rows='dynamic',
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
		cache_to_refresh = False

		# point added
		if len (st.session_state.wandb_edit['added_rows']) > 0:
			st.info ('Ajout de point(s)', icon=':material/info:')
			for row in st.session_state.wandb_edit['added_rows']:
				balance = row['balance'] if 'balance' in row.keys() else 0
				weight = round(row['weight'],1) if 'weight' in row.keys() else 0.0
				glider.weight_and_balances.append( (balance, weight))
			logger.debug('Point(s) added, weight and center of gravity is now {}'.format(glider.weight_and_balances))
			glider.save_weight_and_balance()
			cache_to_refresh = True

		# point modified
		if len (st.session_state.wandb_edit['edited_rows']) > 0:
			st.info ('Sauvegarde des points modifiés', icon=':material/info:')
			for key, value in st.session_state.wandb_edit['edited_rows'].items():
				row_to_update = edited_w_and_b.iloc[key]
				glider.weight_and_balances[key] = (row_to_update['balance'], row_to_update['weight'])

			logger.info('Points(s) modified in weight and center of gravity  {}'.format(glider.weight_and_balances))
			glider.save_weight_and_balance()
			cache_to_refresh = True

		# point deleted
		if len (st.session_state.wandb_edit['deleted_rows']) > 0:
			st.info ('Suppression de point(s)', icon=':material/info:')
			points_to_delete = [ glider.weight_and_balances[value] for value in st.session_state.wandb_edit['deleted_rows']]
			for point in points_to_delete:
				glider.weight_and_balances.remove(point)
			logger.debug('Point(s) deleted,  weight and center of gravity is now {}'.format(glider.weight_and_balances))
			glider.save_weight_and_balance()
			cache_to_refresh = True

		logger.info('update glider {} weight and center of gravity points on database'.format(glider.registration))
		st.success('Points masse & centrage du planeur {} mis à jour avec succès '.format(glider.registration), icon=':material/check_circle:')

		# refresh cache and rerun if the list of users have been updated
		if cache_to_refresh:
			logger.info('Force clear cache')
			st.cache_data.clear()

def edit_glider(glider_registration):
	with glider_placeholder:
		with st.container(): 
			glider = gliders.get(selected_registration)

			st.info('Modification du planeur {}'.format(glider_registration), icon=':material/info:')

			tab1, tab2, tab3 = st.tabs(['Fiche planeur', 'Equipements', 'Masse/centrage'])
			with tab1:
				edit_glider_datasheet(glider, ModeEdition.EDIT)
			with tab2:
				edit_glider_inventory(glider, ModeEdition.EDIT)
			with tab3:
				edit_glider_weight_and_balance(glider)

def delete_glider(glider_registration):
	with glider_placeholder:
		# TODO: add a confirm dialog box using @st.dialog
		glider = gliders.get(selected_registration)
		glider.delete()
		
		st.success('Planeur {} effacé avec succès !'.format(glider_registration), icon=':material/check_circle:')
		st.cache_data.clear()

def new_glider():
	with glider_placeholder:
		with st.container(): 
			glider = Glider(
				model='', registration='TBD', brand='', serial_number='', single_seat=True,
				datum=Dwp.DATUM_WING_2POINTS_AFT_OF_DATUM.value, datum_label='' ,pilot_position=1, wedge='', wedge_position=''
			)
			glider.limits = Limits(*([0.0] * 7))
			glider.arms = Arms(*([0.0] * 7))

			st.info('Ajout d\'un nouveau planeur', icon=':material/info:')
			edit_glider_datasheet(glider, ModeEdition.NEW)

def display_glider():
	with glider_placeholder:
		st.info('Display gliders !', icon=':material/info:')
		rows = [ {
			'registration': key,
			'model': value.model,
			'brand': value.brand,
			'serial_number': value.serial_number,
			'single_seat' : value.single_seat,
		} for key, value in gliders.items()]
		st.dataframe(rows,use_container_width=True)
		# st.write(gliders)

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
	page_icon='✈️',
	layout='wide',
	# initial_sidebar_state='expanded'
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header('Gestion des planeurs')
	users = fetch_users()
	sidebar_menu(users)

	gliders = fetch_gliders()

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
				gliders_options = list(gliders.keys())
				selected_registration = st.selectbox('Choisir un planeur', gliders_options, index=gliders_options.index(st.session_state.selected_registration) if st.session_state.selected_registration in gliders_options else 0)
				st.session_state.selected_registration = selected_registration
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
		if selected_registration is not None:
			edit_glider(selected_registration)
		else:
			st.warning('Aucun planeur sélectionné',icon=':material/warning:')

	if btn_delete:
		if selected_registration is not None:
			delete_glider(selected_registration)
		else:
			st.warning('Aucun planeur sélectionné',icon=':material/warning:')

	if btn_display:
		display_glider()

	if btn_add or st.session_state.btn_add_state:
		new_glider()

logger.debug('END glider_ui.py')
