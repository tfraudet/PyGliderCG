import json
import pandas as pd
import streamlit as st
import yaml
import os
import bcrypt
import jwt
from datetime import datetime, timedelta

import plotly.express as px
import plotly.graph_objects as go

from gliders import Glider, DB_NAME

DEBUG = False

def load_users():
    with open('.streamlit/users.yaml', 'r') as file:
        users = yaml.safe_load(file)
    return users

def authenticate(username, password):
    users = load_users()
    if username in users['credentials']:
        stored_password = users['credentials'][username]['password']
        if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            return True
    return False

def display_plot(current_glider, total_weight, balance, weight_empty_wb = None, balance_empty_wb = None):
	# Plot
	df_limits = current_glider.limits_to_pandas()
		
	# Create a scatter plot with the limit points and lines connecting them
	fig = go.Figure(
		data=[go.Scatter(x=df_limits['centering'], y=df_limits['mass'], mode='markers', name='Points limite de centrage', hoverinfo='skip', showlegend=False)]
	)
	fig.add_trace(
		go.Scatter(x=df_limits['centering'], y=df_limits['mass'], mode='lines', name='Limite de centrage', hoverinfo='skip')
	)

	# define yaxis range
	YAXIS_DTICK = 25
	min_yaxis = ((df_limits['mass'].min()-50) // YAXIS_DTICK) * YAXIS_DTICK
	min_yaxis = min(min_yaxis, total_weight)
	max_yaxis = ((df_limits['mass'].max()+50) // YAXIS_DTICK) * YAXIS_DTICK
	max_yaxis = max(max_yaxis, total_weight)
	fig.update_yaxes(range=[min_yaxis, max_yaxis])

	# define xaxis range
	XAXIS_DTICK = 25
	min_xaxis = ((df_limits['centering'].min()-XAXIS_DTICK) // XAXIS_DTICK) * XAXIS_DTICK
	min_xaxis = min(min_xaxis, balance)
	max_xaxis = (((df_limits['centering'].max()+XAXIS_DTICK) // XAXIS_DTICK)+1) * XAXIS_DTICK
	max_xaxis = max(max_xaxis, balance)
	fig.update_xaxes(range=[min_xaxis, max_xaxis])

	# graph grids
	fig.update_xaxes(showgrid=True, gridwidth=1, gridcolor='gray', griddash='solid')
	fig.update_yaxes(showgrid=True, gridwidth=1, gridcolor='gray', griddash='solid')
	fig.update_xaxes(showline=True, linewidth=1, linecolor='lightgray', mirror=True)
	fig.update_yaxes(showline=True, linewidth=1, linecolor='lightgray', mirror=True)

	# axes configuration
	fig.update_layout(
			xaxis=dict(
				dtick=YAXIS_DTICK, 
				title='<b>Centrage (mm)</b>',
				titlefont=dict(size=16,)
			)
		)
	fig.update_layout(
			yaxis=dict(
				dtick=YAXIS_DTICK, 
				title='<b>Masses (kg)</b>',
				titlefont_size=16,
			)
		)

	# Add a hline for empty weight
	fig.add_hline(y=current_glider.empty_weight(), annotation_text='Masse à vide (kg)', line_width=1, line_dash='dash', line_color='coral')
	# fig.add_trace(
	# 	go.Scatter(
	# 		x=df_limits['centering'],
	# 		y=[ask21.empty_weight()] * len(df_limits['centering']) ,
	# 		mode='lines',  
	# 		line=dict(color="coral", width=1, dash='dash'
	# 		),
	# 		name="Masse à vide (kg)"  
	# 	)
	# )

	# Add the compute weight and balance on the plot
	fig.add_trace(
		go.Scatter(x=[balance], y=[total_weight], mode='markers', name='Centrage calculé', marker_symbol = 'diamond',marker=dict(color='yellow', size=10),
			 hovertemplate='<extra></extra>Centrage calculé: %{x:.0f} mm<br>Mass totale: %{y:.0f} kg', hoverinfo='x+y'
		)
	)
	fig.add_trace(
		go.Scatter(x=[min_xaxis, balance], y=[total_weight, total_weight], mode='lines', line=dict(color="yellow", width=1, dash='dot'),showlegend=False, hoverinfo='skip')
	)
	fig.add_trace(
		go.Scatter(x=[balance, balance], y=[min_yaxis, total_weight], mode='lines', line=dict(color="yellow", width=1, dash='dot'),showlegend=False, hoverinfo='skip')
	)

	# Add the compute weight & Balance when water-ballast are empty	
	if (balance_empty_wb is not None and weight_empty_wb is not None):
		fig.add_trace(
			go.Scatter(x=[balance_empty_wb], y=[weight_empty_wb], mode='markers', name='Centrage Water-Ballast vide', marker_symbol = 'diamond',marker=dict(color='green', size=10),
				hovertemplate='<extra></extra>Centrage Water-Ballast vide: %{x:.0f} mm<br>Mass totale: %{y:.0f} kg', hoverinfo='x+y'
			)
		)
		fig.add_trace(
			go.Scatter(x=[min_xaxis, balance_empty_wb], y=[weight_empty_wb, weight_empty_wb], mode='lines', line=dict(color="green", width=1, dash='dot'),showlegend=False, hoverinfo='skip')
		)
		fig.add_trace(
			go.Scatter(x=[balance_empty_wb, balance_empty_wb], y=[min_yaxis, weight_empty_wb], mode='lines', line=dict(color="green", width=1, dash='dot'),showlegend=False, hoverinfo='skip')
		)

	fig.update_xaxes(showspikes=True, spikethickness=2)
	fig.update_yaxes(showspikes=True, spikethickness=2)

	# Show the plot
	fig.update_layout(
		height=600,
	 	margin=dict(l=0, r=0, b=0, t=20),
		legend=dict( orientation="h", yanchor="bottom", y=-0.2 ),
	)

	st.plotly_chart(fig)

def weight_and_balance_calculator(current_glider):
	col1, col2 = st.columns(2)

	with col1:
		front_pilot_weight = st.number_input( 'Masse pilote avant (en kg)', min_value=0.0, format='%0.1f', step=0.5, key = 'front_pilot_weight', placeholder='Type a number...')
		# st.write("The current number is ", front_pilot_weight)

		front_ballast_weight = st.number_input( 'Masse Gueuse avant (kg)', min_value=0.0, format='%0.1f', step=0.5, key = 'front_ballast_weight', placeholder='Type a number...')
		# st.write("The current number is ", front_ballast_weight)

		wing_water_ballast_weight = st.number_input( 'Masse d\'eau dans les ailes (kg)', min_value=0.0, format='%0.1f', step=0.5, key = 'wing_water_ballast_weight', placeholder='Type a number...')
		# st.write("The current number is ", wing_water_ballast_weight)

	with col2:
		rear_pilot_weight = st.number_input( 'Masse pilote arrière (kg)', min_value=0.0, format='%0.1f', step=0.5, placeholder='Type a number...',
						disabled = True if (current_glider.single_seat) else False, key='rear_pilot_weight')
		# st.write("The current number is ", rear_pilot_weight)

		rear_ballast_weight = st.number_input( 'Masse Gueuse ou water ballast arrière (kg)', min_value=0.0, format='%0.1f', step=0.5, key = 'rear_ballast_weight', placeholder='Type a number...')
		# st.write("The current number is ", rear_ballast_weight)

	if st.button('Calculer',type='primary'):
		st.write('Limite centrage avant: :blue[{}] mm, centrage arrière: :blue[{}] mm'.format(current_glider.limits.front_centering, current_glider.limits.rear_centering))
		
		# calcul du centrage : ∑ des moments / ∑ des masses
		total_weight, balance = current_glider.weight_and_balance_calculator(front_pilot_weight, rear_pilot_weight, front_ballast_weight, rear_ballast_weight, wing_water_ballast_weight)
		st.write('Centrage calculé: masse total :green[{}] kg, centrage :green[{}] mm'.format(round(total_weight,1), round(balance,2)))

		# calcul du centrage water-ballast à vide: ∑ des moments / ∑ des masses
		if (wing_water_ballast_weight>0):
			total_weight_WB_empty, balance_WB_empty = current_glider.weight_and_balance_calculator(front_pilot_weight, rear_pilot_weight, front_ballast_weight, rear_ballast_weight, 0)
			st.write('Centrage water-ballast vide: masse :red[{}] kg, centrage :red[{}] mm'.format(round(total_weight_WB_empty,1), round(balance_WB_empty,2)))
		else:
			total_weight_WB_empty, balance_WB_empty = None, None

		if (balance < current_glider.limits.front_centering) or  (balance > current_glider.limits.rear_centering):
			st.error('Centrage hors secteur',icon='🚨')

		display_plot(current_glider, total_weight, balance, total_weight_WB_empty, balance_WB_empty)

def data_sheet(glider):
	st.code('Pending: mettre ici catégorie et plan de réference)')

	st.divider()
	col1, col2 = st.columns(2)
	with col1:
		st.write("Limitations de masse")
		with st.container(border=True):
			st.write('MMWP: :green[{}] kg'.format(glider.limits.mmwp))
			st.write('MMWV: :green[{}] kg'.format(glider.limits.mmwv))
			st.write('MMENP: :green[{}] kg'.format(glider.limits.mmenp))
			st.write('MMHArnais: :green[{}] kg'.format(glider.limits.mm_harnais))
			st.write('Masse mini pilote: :green[{}] kg'.format(glider.limits.weight_min_pilot))
			st.write('Masse maxi pilote: :green[{}] kg'.format(glider.limits.weight_max_pilot))

		st.write("Limites de centrage")
		with st.container(border=True):
			centrage_avant = st.text_input('Centrage avant (mm)', value=glider.limits.front_centering, disabled=True)
			centrage_arriere = st.text_input('Centrage arrière (mm)', value=glider.limits.rear_centering, disabled=True)

	with col2:
		st.write("Bras de leviers")
		with st.container(border=True):
			arm_front_pilot = st.text_input('Bras de levier pilote avant(mm)', value=glider.arms.arm_front_pilot, disabled=True)
			arm_rear_pilot = st.text_input('Bras de levier pilote arrière (mm)', value=glider.arms.arm_rear_pilot, disabled=True)
			arm_waterballast = st.text_input('Bras de levier waterballast (mm)', value=glider.arms.arm_waterballast, disabled=True)
			arm_front_ballast = st.text_input('Bras de levier gueuse avant (mm)', value=glider.arms.arm_front_ballast, disabled=True)
			arm_rear_watterballast_or_ballast = st.text_input('Bras de levier ballast ou gueuse arrière (mm)', value=glider.arms.arm_rear_watterballast_or_ballast, disabled=True)
			arm_gas_tank = st.text_input('Bras de levier réservoir essence (mm)', value=glider.arms.arm_gas_tank, disabled=True)
			arm_instruments_panel = st.text_input('Bras de levier tableau de bord (mm)', value=glider.arms.arm_instruments_panel, disabled=True)

	# display equipements installed
	st.divider()
	st.subheader('Inventaire')
	st.dataframe(current_glider.instruments, use_container_width=True, hide_index=True,
		column_config={
			"on_board": st.column_config.CheckboxColumn(label="Installé", help='Coché si l\'instrument est en place au moment de la pesée'),
			"instrument": "Instrument",
			"brand": "Marque",
			"type": "Type",
			"number": "N°",
			'date': None,
			"seat": "Où",
		}
	)

def weighing_sheet(glider):
	last_weighing = glider.last_weighing()
	col1, col2 = st.columns(2)
	with col1:
		p1 = st.text_input('P1 (kg)', value=last_weighing.p1, disabled=True)
		p2 = st.text_input('P2 (kg)', value=last_weighing.p2, disabled=True)
		A = st.text_input('A (mm)', value=last_weighing.A, disabled=True)
		D = st.text_input('D (mm)', value=last_weighing.D, disabled=True)
	
	with col2:
		right_wing_weight = st.text_input('Aile droite (kg)', value=last_weighing.right_wing_weight, disabled=True)
		left_wing_weight = st.text_input('Aile gauche (kg)', value=last_weighing.left_wing_weight, disabled=True)
		tail_weight = st.text_input('Empennage H (kg)', value=last_weighing.tail_weight, disabled=True)
		fuselage_weight = st.text_input('Fuselage (kg)', value=last_weighing.fuselage_weight, disabled=True)
		fix_ballast_weight = st.text_input('Masse du lest fixe (kg)', value=last_weighing.fix_ballast_weight, disabled=True)

# set up page details
st.set_page_config(
	page_title="Weight & Balance Calculator",
	page_icon="✈️",
	layout="wide",
)
st.header('✈️ Weight & Balance Calculator for Glider')

gliders = Glider.from_database(DB_NAME)

# gliders_options = [ x.registration for x in gliders]
gliders_options = gliders.keys()
selected_registration = st.selectbox('Choisir un planeur', gliders_options)

current_glider = gliders.get(selected_registration)
if ('selected_glider' not in st.session_state) or (st.session_state.selected_glider != current_glider.model):
	st.session_state.selected_glider = current_glider.model
	st.session_state.rear_pilot_weight = 0
	st.session_state.front_pilot_weight = 0
	st.session_state.front_ballast_weight = 0
	st.session_state.wing_water_ballast_weight = 0
	st.session_state.rear_ballast_weight = 0

st.subheader('{} {} '.format( 'Monoplace' if current_glider.single_seat else 'Biplace', current_glider.registration))
st.write('planeur {} de marque {}'.format(current_glider.model, current_glider.brand ))

if 'debug' in st.query_params and st.query_params['debug'].lower() == 'true':
	DEBUG = True

if DEBUG:
	tab1, tab2, tab3, tab4= st.tabs(["Calculateur centrage pilote", "Fiche planeur", "Pesée", "Debug"])
else:
	tab1, tab2, tab3 = st.tabs(["Calculateur centrage pilote", "Fiche planeur", "Pesée"])

with tab1:
	weight_and_balance_calculator(current_glider)

with tab2:
	data_sheet(current_glider)

with tab3:
	weighing_sheet(current_glider)

if DEBUG:
	with tab4:
		st.write(current_glider)

# Authentication
if 'authenticated' not in st.session_state:
    st.session_state.authenticated = False

if not st.session_state.authenticated:
    with st.sidebar:
        st.header("Login")
        username = st.text_input("Username")
        password = st.text_input("Password", type="password")
        if st.button("Login"):
            if authenticate(username, password):
                st.session_state.authenticated = True
                st.session_state.username = username
                st.experimental_set_query_params(authenticated=True)
                st.experimental_rerun()
            else:
                st.error("Invalid username or password")
else:
    with st.sidebar:
        st.header("Welcome, {}".format(st.session_state.username))
        if st.button("Logout"):
            st.session_state.authenticated = False
            st.experimental_set_query_params(authenticated=False)
            st.experimental_rerun()

# Check for authentication cookie
if 'authenticated' not in st.session_state or not st.session_state.authenticated:
    st.stop()
