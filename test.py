import streamlit as st

def edit_glider():
	with glider_placeholder:
		with st.form('edit-glider', border=True):
			model = st.text_input('Modèle', value='Ventus')

			submitted = st.form_submit_button("Enregistrer", icon=':material/save:')
		
		if submitted:
			st.write('submitted',submitted)
			st.info('Edit: enregistrement successfull', icon=':material/info:')
			st.session_state.btn_edit_state = False

def add_glider():
	with glider_placeholder:
		with st.form('add-glider', border=True):
			model = st.text_input('Modèle', value='')

			submitted = st.form_submit_button("Enregistrer", icon=':material/save:')
		
		if submitted:
			st.write('submitted',submitted)
			st.info('ADD: enregistrement successfull', icon=':material/info:')
			st.session_state.btn_add_state = False

def delete_glider():
	with glider_placeholder:
		st.warning('Delete glider !', icon=':material/warning:')

if 'btn_edit_state' not in st.session_state:
	st.session_state.btn_edit_state = False
# if 'btn_delete_state' not in st.session_state:
# 	st.session_state.btn_delete_state = False
if 'btn_add_state' not in st.session_state:
	st.session_state.btn_add_state = False

with st.container(border=True):
	btn_edit = st.button('Editer',icon=':material/edit:')
	btn_delete =  st.button('Effacerr', icon=':material/delete:')
	btn_add =  st.button('Ajouter', icon=':material/add:')

glider_placeholder = st.empty()

if btn_edit or st.session_state.btn_edit_state:
	st.session_state.btn_edit_state = True
	st.session_state.btn_add_state = False
	# st.session_state.btn_delete_state = False
	edit_glider()

if btn_add or st.session_state.btn_add_state:
	st.session_state.btn_add_state = True
	st.session_state.btn_edit_state = False
	# st.session_state.btn_delete_state = False
	add_glider()

# if btn_delete or st.session_state.btn_delete_state:
if btn_delete :
	# st.session_state.btn_delete_state = True
	# st.session_state.btn_edit_state = False
	delete_glider()
	# st.session_state.btn_delete_state = False

st.write(st.session_state)