import streamlit as st
import logging
from backend_client import BackendClient, BackendException
from config import is_debug_mode, __version__

logger = logging.getLogger(__name__)

def display_main_menu(current_user: dict):
	if st.session_state.get('authenticated'):
		with st.sidebar:
			username = current_user.get('username', '')

			st.write('---')
			st.sidebar.page_link("streamlit_app.py", label="Accueil", icon="🏠")

			role = current_user.get('role', '')
			if role in ['administrator', 'editor']:
				st.sidebar.page_link("pages/gliders_ui.py", label="Planeurs", icon='✈️')
				st.sidebar.page_link("pages/weighing_ui.py", label="Pesées", icon='⚖️')

			if role == 'administrator':
				st.sidebar.page_link("pages/users_ui.py", label="Utilisateurs", icon='👩🏻‍💼')
				st.sidebar.page_link("pages/audit_ui.py", label="Audit Log", icon=':material/description:')

def sidebar_menu():
	DEBUG = is_debug_mode()
	client = BackendClient()

	# Initialize authentication state
	if 'authenticated' not in st.session_state:
		st.session_state.authenticated = False
	if 'auth_token' not in st.session_state:
		st.session_state.auth_token = None
	if 'current_user' not in st.session_state:
		st.session_state.current_user = None

	# Logo
	st.logo(image='img/app-logo-v2.png', size='large', icon_image='img/app-logo-short-v2.png')

	if not st.session_state.authenticated:
		with st.sidebar:
			st.header("Connexion")
			username = st.text_input("Identifiant")
			password = st.text_input("Mot de passe", type="password")
			if st.button("Se connecter", icon=':material/login:'):
				try:
					user = client.login(username, password)
					if user:
						st.session_state.authenticated = True
						st.session_state.current_user = user
						st.rerun()
					else:
						st.error("Identifiant ou mot de passe invalide.", icon=':material/error:')
				except BackendException as e:
					st.warning(f"Service de connexion indisponible. Veuillez réessayer.", icon=':material/warning:')
					logger.error(f'Login error: {e}')
	else:
		with st.sidebar:
			current_user = st.session_state.get('current_user', {})
			username = current_user.get('username', 'Utilisateur')
			role = current_user.get('role', '')
			st.header(f"Bienvenue, {username}")
			st.write(f'Votre rôle est :blue[{role}]')

			# Display main menu
			display_main_menu(current_user)

			if st.button("Déconnexion", icon=':material/logout:'):
				try:
					client.logout()
				except BackendException:
					pass
				finally:
					st.session_state.authenticated = False
					st.session_state.auth_token = None
					st.session_state.current_user = None
					st.switch_page('streamlit_app.py')

	# In DEBUG mode, display the session content
	if DEBUG:
		with st.sidebar:
			st.write('---')
			st.write(st.session_state)

	# Sidebar footer
	st.sidebar.divider()
	material_favorote_html = '<span role="img" aria-label="favorite icon" style="display: inline-block; font-family: &quot;Material Symbols Rounded&quot;; font-weight: 400; user-select: none; vertical-align: bottom; white-space: nowrap; overflow-wrap: normal;">favorite</span>'

	st.sidebar.image('img/acph-logo-v2017-gray.png', width=100)
	st.sidebar.html(f'Made with <span style="color: green">{material_favorote_html}</span> by <a href="https://aeroclub-issoire.fr/">ACPH</a> - version {__version__}')
