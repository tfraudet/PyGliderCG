import streamlit as st
import pandas as pd
import logging

from pages.sidebar import sidebar_menu
from users import UsersDuckDB, User, fetch_users

logger = logging.getLogger(__name__)


logger.debug('START users_ui.py')

st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon='✈️',
	layout='wide',
	# initial_sidebar_state='expanded'
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header('Liste des utilisateurs')
	users = fetch_users()
	sidebar_menu(users)

	users_df = users.get_users()
	with st.form('users-form'):
		edited_users_df = st.data_editor(users.get_users(), key="users_edit", use_container_width=True, num_rows='dynamic',
				# disabled=True if st.session_state.get('FormSubmitter:users-form-Enregistrer') else False,
				column_config={
					"username": st.column_config.TextColumn(
						label="Identifiant",
						help="Identifiant de connexion",
						required=True,
						disabled=False,
						max_chars=50,
					),
					"email": st.column_config.TextColumn(
						label="eMail",
						default="a@b.com",
						max_chars=255,
						# validate=r"^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$",
					),
					"password": st.column_config.TextColumn(
						label="Mot de passe",
						help="Mot de passe de connexion",
						max_chars=255,
						required=True,
					),
					"role": st.column_config.SelectboxColumn(
						label="Role",
						help="Le role de l'utilisateur",
						options=[
							'administrator',
							'editor',

						],
						default='editor',
					),

				}
			)
		submitted = st.form_submit_button("Enregistrer",icon=':material/save:',disabled= True if st.session_state.get('FormSubmitter:users-form-Enregistrer') else False)
	
	# st.write(st.session_state)
	if submitted:
		cache_to_refresh = False
		# user added
		if len (st.session_state.users_edit['added_rows']) > 0:
			for row in st.session_state.users_edit['added_rows']:
				username = row['username']
				if users.find_by_username(username) is None:
					email = row['email'] if 'email' in row.keys() else ''
					password = row['password'] if 'password' in row.keys() else ''
					role = row['role'] if 'role' in row.keys() else ''
					users.create(User(username, email, password,role))
					cache_to_refresh = True
				else:
					st.error('L\'identifiant de l\'utilsateur ne peux pas être vide ou déja exister.', icon=':material/error:')
			if cache_to_refresh: st.success('Utilisateur(s) ajouté(s) avec succès', icon=':material/check_circle:')

		# user edited
		if len (st.session_state.users_edit['edited_rows']) > 0:
			for key, value in st.session_state.users_edit['edited_rows'].items():
				row_to_update = edited_users_df.iloc[key]
				users.update(User(row_to_update['username'], row_to_update['email'], row_to_update['password'],row_to_update['role']))
				cache_to_refresh = True
			if cache_to_refresh: st.success ('Données utilisateur(s) modifiées avec succès', icon=':material/check_circle:')

		# user deleted
		if len (st.session_state.users_edit['deleted_rows']) > 0:
			for idx, value in enumerate(st.session_state.users_edit['deleted_rows']):
				username_to_delete = users_df.iloc[value]['username']
				users.delete(username_to_delete)
				cache_to_refresh = True
			if cache_to_refresh: st.success ('Utilisateur(s) effacé(s) avec succès', icon=':material/check_circle:')

		# refresh cache and rerun if the list of users have been updated
		if cache_to_refresh:
			logger.debug('Force clear cache')
			st.cache_data.clear()

			# logger.debug('Force rerun ')
			# st.rerun(scope='app')
		else:
			st.warning('Aucun enregistrement a sauvegarder/effacer, vérifiez qu\'un des champs dans la table ne soit pas en erreur', icon=':material/warning:')

		if st.session_state.get('FormSubmitter:users-form-Enregistrer'):	
			st.button('Ok')
			st.session_state.pop('FormSubmitter:users-form-Enregistrer')
			st.session_state.pop('users_edit')

# st.write(st.session_state)
logger.debug('END users_ui.py')
