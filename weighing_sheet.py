import streamlit as st

def weighing_sheet(weighing):
	col1, col2 = st.columns(2)
	with col1:
		p1 = st.text_input('P1 (kg)', value=weighing.p1, disabled=True)
		p2 = st.text_input('P2 (kg)', value=weighing.p2, disabled=True)
		A = st.text_input('A (mm)', value=weighing.A, disabled=True)
		D = st.text_input('D (mm)', value=weighing.D, disabled=True)
	
	with col2:
		right_wing_weight = st.text_input('Aile droite (kg)', value=weighing.right_wing_weight, disabled=True)
		left_wing_weight = st.text_input('Aile gauche (kg)', value=weighing.left_wing_weight, disabled=True)
		tail_weight = st.text_input('Empennage H (kg)', value=weighing.tail_weight, disabled=True)
		fuselage_weight = st.text_input('Fuselage (kg)', value=weighing.fuselage_weight, disabled=True)
		fix_ballast_weight = st.text_input('Masse du lest fixe (kg)', value=weighing.fix_ballast_weight, disabled=True)

@st.dialog("Print Weighing Sheet")
def handle_print_weighing_sheet(weighing):
	st.warning('Not yet implemented', icon=':material/warning:')
	if st.button("ok"):
		# st.session_state.vote = {"item": item, "reason": reason}
		st.rerun()
		pass

def min_with_index(*args):
	min_value = min(args)
	return min_value, args.index(min_value)

LIMITS_BY=['',' les élements non portant', 'les harnais']

def weighing_sheet_footer_single_seat(weighing, current_glider):
	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('Monoplace',)
			st.write('Masse mini Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_mini()))
			st.write('Masse maxi Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_maxi()))

			maxPilotWeight, idx = min_with_index(current_glider.pilot_av_maxi(),current_glider.cu_max() , current_glider.limits.mm_harnais)
			st.write('Masse maxi Pilot retenue:  :green[{}] kg, limité par {}'.format(maxPilotWeight, LIMITS_BY[idx]))

		with col2:
			st.write('Etiquette cabine')
			st.write('Masse mini Pilot :green[{}] kg'.format(current_glider.limits.weight_min_pilot))
			st.write('Masse maxi Pilot :green[{}] kg'.format(min(current_glider.pilot_av_maxi(),current_glider.cu_max() , current_glider.limits.mm_harnais)))

def weighing_sheet_footer_double_seat(weighing, current_glider):
	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('En monoplace',)
			st.write('Masse mini Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_mini()))
			st.write('Masse maxi Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_maxi()))
			
			maxPilotWeight, idx = min_with_index(current_glider.pilot_av_maxi(),current_glider.cu_max() , current_glider.limits.mm_harnais)
			st.write('Masse maxi Pilot retenue:  :green[{}] kg, limité par {}'.format(maxPilotWeight, LIMITS_BY[idx]))
		with col2:
			st.write('Etiquette cabine')
			st.write('Masse mini Pilot :green[{}] kg'.format(current_glider.limits.weight_min_pilot))
			st.write('Masse maxi Pilot :green[{}] kg'.format(current_glider.limits.mm_harnais))

	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('En Bibplace',)
			st.write('Masse mini Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_mini()))
			st.write('Masse maxi Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_maxi()))
			
			maxPilotWeight, idx = min_with_index(current_glider.pilot_av_maxi(),current_glider.cu_max() , current_glider.limits.mm_harnais)
			st.write('Masse maxi Pilot retenue:  :green[{}] kg, limité par {}'.format(maxPilotWeight, LIMITS_BY[idx]))
			st.info('Charge utile de :green[{}] kg dans le respect des limitations de masse de centrage et de siège à :green[{}] kg'
				.format(current_glider.cv_max(), current_glider.limits.mm_harnais), icon=':material/info:')
		with col2:
			st.write('Etiquette cabine')
			st.write('Masse mini Pilot :green[{}] kg'.format(current_glider.limits.weight_min_pilot))
			st.write('Masse maxi Pilot :green[{}] kg'.format(current_glider.limits.mm_harnais))
			st.info('Charge utile de :green[{}] kg dans le respect des limitations de masse centrage de centrage et de siège à :green[{}] kg'
				.format(current_glider.cv_max(), current_glider.limits.mm_harnais), icon=':material/info:')

def display_detail_weighing(weighing, current_glider, print=False):

	# def round_float_fields(weighing):
	# 	for field in weighing.__dataclass_fields__:
	# 		value = getattr(weighing, field)
	# 		if isinstance(value, float):
	# 			setattr(weighing, field, round(value, 1))

	if (weighing is not None):
		st.subheader('Détails de la pesée #{} du {}'.format(weighing.id, weighing.date.strftime('%d/%m/%Y')))
		weighing_sheet(weighing)
		# round_float_fields(weighing)

		col1, col2 = st.columns(2)
		with col1:
			st.metric(label="Masse à vide équipée MVE (kg)", value= weighing.mve())
			st.metric(label='Masse à vide des élements non portants (MVENP) en kg', value=weighing.mvenp())

		with col2:
			st.metric('Charge variable max (kg)', current_glider.cv_max())
			st.metric('Charge utile max (kg)', current_glider.cu_max())
			st.metric('X0 (mm)', current_glider.empty_arm())

		if current_glider.single_seat:
			weighing_sheet_footer_single_seat(weighing, current_glider)
		else:
			weighing_sheet_footer_double_seat(weighing, current_glider)

		if print and st.button('Imprime la fiche de pesée', type='primary', icon=':material/print:'):
			handle_print_weighing_sheet(weighing)
	else:
		st.warning('Aucune pesée sélectionnée', icon=':material/warning:')
