import json
import pandas as pd
import streamlit as st
import yaml
import os
import logging

from datetime import datetime, timedelta

import plotly.express as px
import plotly.graph_objects as go

from gliders import fetch_gliders, get_datum_image_by_label, DATUMS
from config import FAVICON_WEB, get_database_name
from users import fetch_users
from init_db import initialize_database
from pages.sidebar import sidebar_menu, is_debug_mode
from weighing_sheet import display_detail_weighing
from audit_log import AuditLogDuckDB
from streamlit_theme import st_theme
from shapely.geometry import Point, Polygon
from dotenv import load_dotenv

# load environment variables from .env file
load_dotenv()

# Initialize the logger
# Based on streamlit logging level defined in config.toml, define the logging level for the python logger
logger = logging.getLogger(__name__)
if st.get_option("logger.level").lower() == 'debug':
	level_logging=logging.DEBUG
elif st.get_option("logger.level").lower() == 'info':
	level_logging=logging.INFO
elif st.get_option("logger.level").lower() == 'warning':
	level_logging=logging.WARNING
elif st.get_option("logger.level").lower() == 'error':
	level_logging=logging.ERROR
elif st.get_option("logger.level").lower() == 'critical':
	level_logging=logging.CRITICAL
else:
	level_logging=logging.INFO,

logging.basicConfig(
	level=level_logging,
	# level=logging.DEBUG,
	# format='%(asctime)s - %(levelname)s - %(message)s',
	format='%(asctime)s %(levelname) -7s %(name)s: %(message)s',
	handlers=[logging.StreamHandler()   ]
)

THEME_LIGHT = {
	'template' : 'plotly',			# "plotly", "plotly_white", "plotly_dark", "ggplot2", "seaborn", "simple_white",
	'emptyWeightLine': 'magenta',
	'cgCalcLine': "green",
	'cgCalcLineWB': 'orange',
	'cgLimitLine': "blue",
}
THEME_DARK = {
	'template' : 'plotly_dark',	# "plotly", "plotly_white", "plotly_dark", "ggplot2", "seaborn", "simple_white",
	'emptyWeightLine': 'magenta',
	'cgCalcLine': 'lime',
	'cgCalcLineWB': 'yellow',
	# "cgLimitLine": "cornflowerblue",
	'cgLimitLine': 'deepskyblue',
}


# this doesn't work, need to try to inject the custom content to the index.html file at runtime.
# hack possible here https://stackoverflow.com/questions/70520191/how-to-add-the-google-analytics-tag-to-website-developed-with-streamlit/78992559#78992559 
import streamlit.components.v1 as components
def add_apple_icon():
	components.html(
		"""
		<link rel="apple-touch-icon" href="./img/icon/web/apple-touch-icon.png">
		""",
		height=0 # Important: Set height to 0 to avoid extra space
	)

def is_light_mode():
	# theme = st_theme()
	# return theme is not None and theme['backgroundColor'] == '#ffffff'
	return True if st.get_option("theme.base")=='light' else False

def display_plot(current_glider, total_weight, balance, weight_empty_wb = None, balance_empty_wb = None, weight_none_lift = None, balance_percent = None, balance_percent_wb_empty= None):
	# Plot
	df_limits = current_glider.limits_to_pandas()
		
	# Create a scatter plot with the limit points and lines connecting them
	fig = go.Figure(
		data=[go.Scatter(x=df_limits['centering'], y=df_limits['mass'], mode='markers', name='Points limite de centrage', hoverinfo='skip', showlegend=False)]
	)
	fig.add_trace(
		go.Scatter(x=df_limits['centering'], y=df_limits['mass'], mode='lines', name='Limite de centrage', hoverinfo='skip', 
					line=dict(color=active_theme['cgLimitLine'], width=1))
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
				titlefont=dict(size=22,)
			)
		)
	fig.update_layout(
			yaxis=dict(
				dtick=YAXIS_DTICK, 
				title='<b>Masse (kg)</b>',
				titlefont_size=22,
			)
		)

	# Add a hline for empty weight
	# fig.add_hline(y=current_glider.empty_weight(), 
	# 		annotation_text='Masse à vide: {} kg'.format(current_glider.empty_weight()), annotation_font=dict(size=14),
	# 		line_width=1, line_dash='dash', line_color=active_theme['emptyWeightLine'])

	# Add maximum and compute weight of non-lifting elements + rear water ballast + gueuses
	fig.add_hline(y=current_glider.limits.mmenp, 
			annotation_text='Masse maximum élements non portants: {} kg'.format(current_glider.limits.mmenp), annotation_font=dict(size=14),
			line_width=1, line_color=active_theme['emptyWeightLine'])
	fig.add_trace(
		go.Scatter(x=[balance], y=[weight_none_lift], mode='markers', name='Masse ENP + occupants + gueuses et/ou water ballast', marker_symbol = 'square',marker=dict(color=active_theme['emptyWeightLine'], size=10),
			hovertemplate='<extra></extra>Masse éléments non portants + occupants + gueuses et/ou water ballast <b>%{y:.0f} kg</b>', hoverinfo='x+y', 
		)
	)
	fig.add_annotation(x=balance+4, y=min_yaxis+14, text="{}%".format(round(balance_percent,1)), showarrow=False, font=dict(size=12, color=active_theme['cgCalcLine']) )

	# Add the compute weight and balance on the plot
	fig.add_trace(
		go.Scatter(x=[balance], y=[total_weight], mode='markers', name='Centrage calculé', marker_symbol = 'diamond',marker=dict(color=active_theme['cgCalcLine'], size=10),
			 hovertemplate='<extra></extra>Centrage calculé: %{x:.0f} mm<br>Mass totale: %{y:.0f} kg', hoverinfo='x+y'
		)
	)
	fig.add_trace(
		go.Scatter(x=[min_xaxis, balance], y=[total_weight, total_weight], mode='lines', line=dict(color=active_theme['cgCalcLine'], width=1, dash='dot'),showlegend=False, hoverinfo='skip')
	)
	fig.add_trace(
		go.Scatter(x=[balance, balance], y=[min_yaxis, total_weight], mode='lines', line=dict(color=active_theme['cgCalcLine'], width=1, dash='dot'),showlegend=False, hoverinfo='skip')
	)

	# Add the compute weight & Balance when water-ballast are empty	
	if (balance_empty_wb is not None and weight_empty_wb is not None):
		fig.add_trace(
			go.Scatter(x=[balance_empty_wb], y=[weight_empty_wb], mode='markers', name='Centrage Water-Ballast vide', marker_symbol = 'diamond',marker=dict(color=active_theme['cgCalcLineWB'], size=10),
				hovertemplate='<extra></extra>Centrage Water-Ballast vide: %{x:.0f} mm<br>Mass totale: %{y:.0f} kg', hoverinfo='x+y'
			)
		)
		fig.add_trace(
			go.Scatter(x=[min_xaxis, balance_empty_wb], y=[weight_empty_wb, weight_empty_wb], mode='lines', line=dict(color=active_theme['cgCalcLineWB'], width=1, dash='dot'),showlegend=False, hoverinfo='skip')
		)
		fig.add_trace(
			go.Scatter(x=[balance_empty_wb, balance_empty_wb], y=[min_yaxis, weight_empty_wb], mode='lines', line=dict(color=active_theme['cgCalcLineWB'], width=1, dash='dot'),showlegend=False, hoverinfo='skip')
		)
		fig.add_annotation(x=balance_empty_wb+4, y=min_yaxis+14, text="{}%".format(round(balance_percent_wb_empty,1)), showarrow=False, font=dict(size=12, color=active_theme['cgCalcLineWB']) )
		fig.add_trace(
			go.Scatter(x=[balance_empty_wb], y=[weight_none_lift], mode='markers', name='Masse ENP + occupants + gueuses et/ou water ballast', marker_symbol = 'square',marker=dict(color=active_theme['emptyWeightLine'], size=10),
				hovertemplate='<extra></extra>Masse éléments non portants + occupants + gueuses et/ou water ballast <b>%{y:.0f} kg</b>', hoverinfo='x+y', showlegend=False
		)
	)

	fig.update_xaxes(showspikes=True, spikethickness=2)
	fig.update_yaxes(showspikes=True, spikethickness=2)

	# Show the plot
	fig.update_layout(
		height=600,
	 	margin=dict(l=0, r=0, b=0, t=20),
		legend=dict( orientation="h", yanchor="bottom", y=-0.2 ),
		template=active_theme['template'],
	)

	config = {'modeBarButtonsToRemove': ['pan2d', 'lasso2d', 'select2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d', 'zoom2d']}
	st.plotly_chart(fig,config=config, theme=None)

def weight_and_balance_calculator(current_glider):
	col1, col2 = st.columns(2)

	with col1:
		front_pilot_weight = st.number_input( 'Masse pilote avant (en kg)', min_value=0.0, max_value=current_glider.limits.mm_harnais,
			format='%0.1f', step=0.5, key = 'front_pilot_weight', placeholder='Type a number...')
		front_ballast_weight = st.number_input( 'Masse Gueuse avant (kg)', min_value=0.0, format='%0.1f', step=0.5, key = 'front_ballast_weight', placeholder='Type a number...')
		wing_water_ballast_weight = st.number_input( 'Masse d\'eau dans les ailes (kg)', min_value=0.0, format='%0.1f', step=0.5, key = 'wing_water_ballast_weight', placeholder='Type a number...')

	with col2:
		rear_pilot_weight = st.number_input( 'Masse pilote arrière (kg)', min_value=0.0, max_value=current_glider.limits.mm_harnais, 
			format='%0.1f', step=0.5, placeholder='Type a number...', disabled = True if (current_glider.single_seat) else False, key='rear_pilot_weight')
		rear_ballast_weight = st.number_input( 'Masse Gueuse ou water ballast arrière (kg)', min_value=0.0, format='%0.1f', step=0.5, key = 'rear_ballast_weight', placeholder='Type a number...')

	if st.button('Calculer',type='primary', icon=':material/calculate:'):		
		# calcul du centrage : ∑ des moments / ∑ des masses
		total_weight, balance = current_glider.weight_and_balance_calculator(front_pilot_weight, rear_pilot_weight, front_ballast_weight, rear_ballast_weight, wing_water_ballast_weight)

		# centering in %
		balance_percent = (balance - current_glider.limits.front_centering) / (current_glider.limits.rear_centering - current_glider.limits.front_centering) * 100

		st.write('Centrage calculé :green[{}] mm (vs limite centrage avant: :blue[{}] mm, centrage arrière: :blue[{}] mm)'.format(
			round(balance,0), current_glider.limits.front_centering, current_glider.limits.rear_centering
		))
		st.write('Masse totale calculée :green[{}] kg (vs masse maximum: :blue[{}] kg)'.format(round(total_weight,1), current_glider.limits.mmwp))

		# calcul du centrage water-ballast à vide: ∑ des moments / ∑ des masses
		if (wing_water_ballast_weight>0):
			total_weight_WB_empty, balance_WB_empty = current_glider.weight_and_balance_calculator(front_pilot_weight, rear_pilot_weight, front_ballast_weight, rear_ballast_weight, 0)
			st.write('Centrage calculé (water ballast vide) :orange[{}] mm (vs limite centrage avant: :blue[{}] mm, centrage arrière: :blue[{}] mm)'.format(
				round(balance_WB_empty,0), current_glider.limits.front_centering, current_glider.limits.rear_centering
			))
			st.write('Masse totale calculée  (water ballast vide) :orange[{}] kg (vs masse maximum: :blue[{}] kg)'.format(round(total_weight_WB_empty,1), current_glider.limits.mmwp))
			balance_percent_wb_empty = (balance_WB_empty - current_glider.limits.front_centering) / (current_glider.limits.rear_centering - current_glider.limits.front_centering) * 100
		else:
			total_weight_WB_empty, balance_WB_empty, balance_percent_wb_empty = None, None, None

		# check if the maximum weight of non-lift elements if not exceeded
		weight_none_lift = current_glider.last_weighing().mvenp() + front_pilot_weight + rear_pilot_weight + front_ballast_weight + rear_ballast_weight
		if (weight_none_lift > current_glider.limits.mmenp):
			st.error('La masse maximum des éléments non portants  + occupants + gueuese et /ou waterballast arrière dépasse la Masse maximum des élements non portants', icon=':material/error:')
		else:
			st.write('Masse éléments non portants + occupants + gueuse & water ballast arrière: :green[{}] kg (vs Masse maximum ENP :blue[{}] kg)'.format(weight_none_lift, current_glider.limits.mmenp))

		polygon = Polygon(current_glider.limits_to_pandas()[['centering', 'mass']].values)
		if not polygon.contains(Point(balance, total_weight)):
			st.error('Centrage hors secteur.', icon=':material/error:')

		display_plot(current_glider, total_weight, balance, total_weight_WB_empty, balance_WB_empty, weight_none_lift, balance_percent, balance_percent_wb_empty)

def data_sheet(glider):
	st.subheader('Référence de pesée')
	datum_labels = [datum['label'] for datum in DATUMS.values()]
	datum_and_weighing_points_position = st.selectbox('Plan de référence et type d\'appui',datum_labels, index=glider.datum-1, disabled=True)
	col1, col2 = st.columns(2)
	with col1:
		st.image(get_datum_image_by_label(datum_and_weighing_points_position), use_container_width=True)
		pilote_position = st.radio('Position du pilote', options=['En avant de la référence', 'En arrière de la référence'], index=glider.pilot_position-1,  disabled=True)

	with col2:
		datum_text = st.text_input('Plan de référence', placeholder='Bord d\'attaque à l\'emplature de l\'aile', value=glider.datum_label,  disabled=True)	
		wedge = st.text_input('Cale de référence', placeholder='45/1000', value=glider.wedge,  disabled=True)
		wedge_position = st.text_input('Position de la cale de référence',placeholder='Dessus du fuselage entre aile et dérive', value=glider.wedge_position,  disabled=True)

	st.divider()
	st.subheader('Limites de masse et bras de leviers')
	col1, col2 = st.columns(2)
	with col1:
		st.write("Limitations de masse")
		with st.container(border=True):
			limits_mmwp = st.number_input('MMWP (kg)', format='%0.1f', step=0.5, value = glider.limits.mmwp, help='Masse maximal ou masse maximal water ballast plein', disabled=True)
			limits_mmwv = st.number_input('MMWV (kg)', format='%0.1f', step=0.5, value = glider.limits.mmwv, help='Masse maximal water ballast vide ou masse maximal si pas de water ballast', disabled=True)
			limits_mmenp = st.number_input('MMENP (kg)', format='%0.1f', step=0.5, value = glider.limits.mmenp, help='Masse maximale des éléments non portants', disabled=True)
			limits_mm_harnais = st.number_input('MMHarnais (kg)', format='%0.1f', step=0.5, value = glider.limits.mm_harnais, help='Masse maximale d\'utilisation du harnais', disabled=True)
			limits_weight_min_pilot = st.number_input('Masse mini pilote (kg)', format='%0.1f', step=0.5, value = glider.limits.weight_min_pilot, help='Masse mini du pilote', disabled=True)

		st.write("Limites de centrage")
		with st.container(border=True):
			centrage_avant = st.number_input('Centrage avant (mm)', format='%0.0f', step=1.0, value=glider.limits.front_centering, help='Limite de centrage avant', disabled=True)
			centrage_arriere = st.number_input('Centrage arrière (mm)',  format='%0.0f', step=1.0, value=glider.limits.rear_centering,help='Limite de centrage arrière', disabled=True )

	with col2:
		st.write("Bras de leviers")
		with st.container(border=True):
			arm_front_pilot = st.text_input('Bras de levier pilote avant(mm)', value=glider.arms.arm_front_pilot, disabled=True)
			arm_rear_pilot = st.text_input('Bras de levier pilote arrière (mm)', value=glider.arms.arm_rear_pilot, disabled=True)
			arm_waterballast = st.text_input('Bras de levier waterballast (mm)', value=glider.arms.arm_waterballast, disabled=True)
			arm_front_ballast = st.text_input('Bras de levier gueuse avant (mm)', value=glider.arms.arm_front_ballast, disabled=True)
			arm_rear_watterballast_or_ballast = st.text_input('Bras de levier ballast ou gueuse arrière (mm)', value=glider.arms.arm_rear_watterballast_or_ballast, disabled=True)
			# arm_gas_tank = st.text_input('Bras de levier réservoir essence (mm)', value=glider.arms.arm_gas_tank, disabled=True)
			arm_instruments_panel = st.text_input('Bras de levier tableau de bord (mm)', value=glider.arms.arm_instruments_panel, disabled=True)

	# display equipements installed
	st.divider()
	st.subheader('Inventaire')
	st.dataframe(current_glider.instruments, use_container_width=True, hide_index=True,
		column_config={
			'id' : {'hidden': True},
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
	display_detail_weighing(last_weighing, glider)

logger.debug('START streamlit_app.py')
# set up page details
st.set_page_config(
	page_title='Weight & Balance Calculator',
	page_icon=FAVICON_WEB,
	layout='wide',
	initial_sidebar_state='collapsed'
)
# add_apple_icon()

active_theme = THEME_LIGHT if is_light_mode() else THEME_DARK
st.header('✈️ Calculateur Centrage Planeur')
initialize_database(get_database_name())

# load data
gliders =fetch_gliders()
users = fetch_users()

# Initialize the audit logger
audit = AuditLogDuckDB().set_database_name(get_database_name())
logger.debug('Audit log: {}'.format(audit))

# warning message
st.warning('Attention : Ce logiciel est un outil d\'aide à la décision pour le calcul du centrage. La fiche de pesée est le document de référence, et la responsabilité finale du centrage incombe au commandant de bord.', icon=':material/warning:')

# gliders_options = [ x.registration for x in gliders]
gliders_options = gliders.keys()
selected_registration = st.selectbox('Choisir un planeur', gliders_options)

current_glider = gliders.get(selected_registration)

if (current_glider is not None):
	if ('selected_glider' not in st.session_state) or (st.session_state.selected_glider != current_glider.model):
		st.session_state.selected_glider = current_glider.model
		st.session_state.rear_pilot_weight = 0
		st.session_state.front_pilot_weight = 0
		st.session_state.front_ballast_weight = 0
		st.session_state.wing_water_ballast_weight = 0
		st.session_state.rear_ballast_weight = 0

	st.subheader('{} {} '.format( 'Monoplace' if current_glider.single_seat else 'Biplace', current_glider.registration))
	st.write('planeur {} de marque {}'.format(current_glider.model, current_glider.brand ))

	if is_debug_mode():
		tab1, tab2, tab3, tab4= st.tabs(["Calculateur centrage pilote", "Fiche planeur", "Pesée", "Debug"])
	else:
		tab1, tab2, tab3 = st.tabs(["Calculateur centrage pilote", "Fiche planeur", "Pesée"])

	with tab1:
		if current_glider.last_weighing() is not None:
			weight_and_balance_calculator(current_glider)
		else:
			st.warning('Aucune pesée trouvée pour ce planeur', icon=':material/warning:')

	with tab2:
		data_sheet(current_glider)

	with tab3:
		if current_glider.last_weighing() is not None:
			weighing_sheet(current_glider)
		else:
			st.warning('Aucune pesée trouvée pour ce planeur', icon=':material/warning:')

	if is_debug_mode():
		with tab4:
			st.write(current_glider)
else:
	st.warning('Aucun planeur trouvé dans la base de données', icon=':material/warning:')

# display sidebar menu
sidebar_menu(users)
logger.debug('END streamlit_app.py')
