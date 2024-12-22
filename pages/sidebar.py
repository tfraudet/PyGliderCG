import streamlit as st
from users import Users
from config import is_debug_mode, __version__

def display_main_menu(users : Users):
	if st.session_state.authenticated:
		with st.sidebar:
			username = st.session_state.username

			st.write('---')
			st.sidebar.page_link("streamlit_app.py", label="Accueil", icon="🏠")

			if users.is_admin(username) or users.is_editor(username):
				st.sidebar.page_link("pages/gliders_ui.py", label="Planeurs", icon='✈️')
				st.sidebar.page_link("pages/weighing_ui.py", label="Pesées", icon='⚖️')
				# st.sidebar.page_link("pages/weighing_ui_old.py", label="Pesées (old)", icon='⚖️')

			if users.is_admin(username):
				st.sidebar.page_link("pages/users_ui.py", label="Utilisateurs", icon='👩🏻‍💼')
				st.sidebar.page_link("pages/audit_ui.py", label="Audit Log", icon=':material/description:')

def sidebar_menu(users : Users):
	DEBUG = is_debug_mode()

	# Authentication
	if 'authenticated' not in st.session_state:
		st.session_state.authenticated = False

	# logo
	# st.logo(image='img/app-logo.png',size='large', icon_image='img/app-logo-short.png')
	st.logo(image='img/app-logo-v2.png',size='large', icon_image='img/app-logo-short-v2.png')

	if not st.session_state.authenticated:
		with st.sidebar:
			st.header("Connexion")
			username = st.text_input("Identifiant")
			password = st.text_input("Mot de passe", type="password")
			if st.button("Se connecter", icon=':material/login:'):
				if users.login(username, password):
					st.session_state.authenticated = True
					st.session_state.username = username
					st.rerun()
				else:
					st.error("Identifiant ou mot de passe invalide.", icon=':material/error:')
	else:
		with st.sidebar:
			st.header("Bienvenue, {}".format(st.session_state.username))
			st.write('Votre role est :blue[{}]'.format(users.get_role(st.session_state.username)))

			# display Main menu
			display_main_menu(users)

			if st.button("Déconnexion", icon=':material/logout:'):
				users.logout(st.session_state.username)
				st.session_state.authenticated = False
				st.session_state.pop('username', None)
				st.switch_page('streamlit_app.py')

	# in DEBUG mode, display the session content
	if DEBUG:
		with st.sidebar:
			st.write('---')
			st.write(st.session_state)

	# sidebar footer  color #D16D6A
	st.sidebar.divider()
	material_favorote_html = '<span role="img" aria-label="favorite icon" style="display: inline-block; font-family: &quot;Material Symbols Rounded&quot;; font-weight: 400; user-select: none; vertical-align: bottom; white-space: nowrap; overflow-wrap: normal;">favorite</span>'

	st.sidebar.image('img/acph-logo-v2017-gray.png', width=100)
	st.sidebar.html('Made with <span style="color: green">{}</span> by <a href="https://aeroclub-issoire.fr/">ACPH</a> - version {}'.format(material_favorote_html, __version__))
