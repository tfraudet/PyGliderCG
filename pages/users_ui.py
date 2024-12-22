import time
import streamlit as st
import pandas as pd
import logging

from config import FAVICON_WEB, get_database_name
from pages.sidebar import sidebar_menu
from users import UsersDuckDB, User, fetch_users

logger = logging.getLogger(__name__)

import duckdb
import zipfile
import os

def export_database(exported_directory='data/exported_db'):
	@st.dialog('Exporter la base de données')
	def download_file(zip_filename):
		with open(zip_filename, 'rb') as f:
			st.write('Base de données zippée avec succès')
			file_size = round(os.path.getsize(zip_filename) / 1024, 2)
			st.write(f'Taille du fichier à télécharger: {file_size} KB')

			if st.download_button('Télécharger', f, file_name=zip_filename):
				st.success('La base de données a été téléchargée avec succès', icon=':material/check_circle:')
	
	# Connect to the DuckDB database
	con = duckdb.connect(get_database_name())
	
	# Export the database to a directory
	con.execute(f"EXPORT DATABASE '{exported_directory}' (FORMAT PARQUET);")
	con.close()
	
	# Create a zip file of the exported directory
	zip_filename = 'exported_db.zip'
	with zipfile.ZipFile(zip_filename, 'w') as zipf:
		for root, dirs, files in os.walk(exported_directory):
			for file in files:
				zipf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), exported_directory))
	download_file(zip_filename)

def import_database(imported_directory='data/imported_db'):
	@st.dialog('Importer la base de données')
	def import_file(imported_directory):
		uploaded_file = st.file_uploader('Sélectionner un fichier zip', type='zip')
		if uploaded_file is not None:
			# unzip the file uploaded_file to the directory 'imported_db'
			with zipfile.ZipFile(uploaded_file, 'r') as zip_ref:
				zip_ref.extractall(imported_directory)

			# drop the old database and import the new one from the directory 'imported_db'
			con = duckdb.connect(get_database_name())
			con.execute(f"DROP TABLE WEIGHING;")
			con.execute(f"DROP TABLE WB_LIMIT;")
			con.execute(f"DROP TABLE INVENTORY;")
			con.execute(f"DROP TABLE USERS;")
			con.execute(f"DROP TABLE GLIDER;")
			con.execute(f"DROP SEQUENCE inventory_id_seq;")
			con.execute(f"DROP SEQUENCE auto_increment;")
			con.execute(f"IMPORT DATABASE '{imported_directory}';")
			con.close()
			st.success('Base de données importée avec succès', icon=':material/check_circle:')
			st.cache_data.clear()
			with st.spinner('Vous allez être déconnecté dans 5 secondes...'):
				time.sleep(5)
			st.rerun()

	import_file(imported_directory)


logger.debug('START users_ui.py')
st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon=FAVICON_WEB,
	layout='wide',
	# initial_sidebar_state='expanded'
)

if ('authenticated' not in st.session_state) or (not st.session_state.authenticated):
	st.switch_page('streamlit_app.py')
else:
	st.header(':material/account_circle: Liste des utilisateurs')
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
			logger.debug('Force users clear cache')
			fetch_users.clear()

			# logger.debug('Force rerun ')
			# st.rerun(scope='app')
		else:
			st.warning('Aucun enregistrement a sauvegarder/effacer, vérifiez qu\'un des champs dans la table ne soit pas en erreur', icon=':material/warning:')

		if st.session_state.get('FormSubmitter:users-form-Enregistrer'):	
			st.button('Ok')
			st.session_state.pop('FormSubmitter:users-form-Enregistrer')
			st.session_state.pop('users_edit')

	# Other admini function like import/export of the database
	st.divider()
	st.subheader(':material/settings: Administration')

	if st.button(":material/cloud_download: Exporter la base de données"):
		export_database()
	if st.button(":material/cloud_upload: Importer la base de données"):
		import_database()

# st.write(st.session_state)
logger.debug('END users_ui.py')
 