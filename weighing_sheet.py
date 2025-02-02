
from datetime import datetime
import streamlit as st

import io
import base64
from xhtml2pdf import pisa

from gliders import DATUMS, get_datum_image_by_label

# alternative https://weasyprint.org/
# doc here https://doc.courtbouillon.org/weasyprint/stable/
# it support https://docraptor.com/css-paged-media

html_head_template = """
<head>
<style>
	@page {
		size: a4 portrait;
		@frame header_frame {           /* Static Frame */
			-pdf-frame-content: header_content;
			left: 50pt; width: 512pt; top: 50pt; height: 40pt;
		}
		@frame content_frame {          /* Content Frame */
			left: 50pt; width: 512pt; top: 90pt; height: 662pt;
			/* -pdf-frame-border: 1; */
		}
		@frame footer_frame {           /* Another static Frame */
			-pdf-frame-content: footer_content;
			left: 50pt; width: 512pt; top: 772pt; height: 20pt;
		}
	}

	.standard {
		border-collapse: collapse;
		border: 1px solid black;
		padding-left: 0pt;
		padding-right: 0pt;
	}
	.standard th, .standard td {
		border: 1px solid black;
		padding-top: 2pt;
		padding-left: 3pt;
		padding-right: 3pt;
		text-align: center;
	}

	.one-column {
		border: 0px solid red;
		padding-left: 40pt;
		padding-right: 40pt;
	}
	
	.two-columns {
		border: 0px solid red;
	}

	.w150 {	
		width: 150pt;
	}

	.w100 {	
		width: 50pt;
	}

	#configuration {
		margin-bottom: 20pt;
	}
	
	#inputs > tbody > tr > td, #outputs > tbody > tr > td, {
		vertical-align: top;
	}

	#inputs {
		margin-bottom: 20pt;
	}

	.p00 {
		padding-left: 0pt;
		padding-right: 0pt;
	}
	
	.p20 {
		padding-left: 20pt;
		padding-right: 20pt;
	}

	h1, h2 {
		text-align: center;
	}

	.thick {
		font-weight: bold;

	}	

	p.separator { -pdf-keep-with-next: false; font-size: 6pt; }
</style>
</head>
"""

html_body_template = """
<body>
	<!-- Content for Static Frame 'header_frame' -->
	<div id="header_content" >
		<img src="https://aeroclub-issoire.fr/wp-content/uploads/2016/03/logo-acph.jpg" >
	</div>

	<!-- Content for Static Frame 'footer_frame' -->
	<div id="footer_content">Edité le {today} - © ACPH, page <pdf:pagenumber> de <pdf:pagecount>
	</div>

	<!-- HTML Content -->
	<h1>Fiche de Pesée {reg}</h1>

	<!-- Cartouche -->
	<table class="one-column">
		<tr>
			<td>
				<table id="cartouche" class="standard">
					<tr>
						<th>Immatriculation</th>
						<th>Constructeur</th>
						<th>Modèle</th>
						<th>N° de série</th>
					</tr>
					<tr>
						<td> {reg} </td>
						<td> {brand} </td>
						<td> {model} </td>
						<td> {serial_number} </td>
					</tr>
					<tr>
						<th>Date pesée</th>
						<th>Mécanicien</th>
						<th>Licence n°</th>
						<th>Signature</th>
					</tr>
					<tr>
						<td> {weighing_date} </td>
						<td> </td>
						<td> </td>
						<td> </td>
					</tr>
				</table>
			</td>
		</tr>
	</table>

	<!-- Configuration de pesée -->
	<p class="separator"></p>
	<h2>Configuration de pesée</h2>
	
	<table id="configuration" class="two-columns">
		<tr>
			<td>
				<img src="data:image/png;base64,{image}" width="300">
			</td>
			<td class="p00">
				<table class="standard">
					<tr><td class="w100 thick">Plan de référence</td><td>{datum_label} </td></tr>
					<tr><td class="w100 thick">Cale de référence</td><td>{wedge} </td></tr>
					<tr><td class="w100 thick">Position cale</td><td>{wedge_position} </td></tr>
				</table>
			</td>
		</tr>
	</table>

	<!-- Données constructeur et pesée -->
	<table id="inputs" class="two-columns">
		<tr>
			<th><h2>Données constructeur</h2></th>
			<th><h2>Mesures relevées</h2></th>
		</tr>
		<tr>
			<td class="p20">
				<table class="standard">
					<tr><td class="w150 thick">Masse maxi autorisée</td><td>{mmwp} kg</td></tr>
					<tr><td class="w150 thick">Masse maxi WB vide</td><td>{mmwv} kg</td></tr>
					<tr><td class="w150 thick">Masse maxi ENP</td><td>{mmenp} kg</td></tr>
					<tr><td class="w150 thick">Masse maxi Harnais</td><td>{mm_harnais} kg</td></tr>
					<tr><td class="w150 thick">Limite centrage avant</td><td>{front_centering} mm</td></tr>
					<tr><td class="w150 thick">Limite centrage arrière</td><td>{rear_centering} mm</td></tr>

					<tr><td class="w150 thick">Bras de levier Pilot avant</td><td>{arm_front_pilot} mm</td></tr>
					<tr><td class="w150 thick">Bras de levier Pilot arrière</td><td>{arm_rear_pilot} mm</td></tr>
					<tr><td class="w150 thick">Bras de levier WB ailes</td><td>{arm_waterballast} mm</td></tr>
					<tr><td class="w150 thick">Bras de levier gueuse avant</td><td>{arm_front_ballast} mm</td></tr>
					<tr><td class="w150 thick">Bras de levier gueuse arrière </td><td>{arm_rear_watterballast_or_ballast} mm</td></tr>

				</table>
			</td>
			<td class="p20">
				<table class="standard">
					<tr><td class="thick">P1</td><td>{p1} kg</td></tr>
					<tr><td class="thick">P2</td><td>{p2} kg</td></tr>
					<tr><td class="thick">A</td><td>{A} mm</td></tr>
					<tr><td class="thick">D</td><td>{D} mm</td></tr>
					<tr><td class="thick">Aile droite</td><td>{right_wing_weight} kg</td></tr>
					<tr><td class="thick">Aile gauche</td><td>{left_wing_weight} kg</td></tr>
					<tr><td class="thick">Empennage H</td><td>{tail_weight} kg</td></tr>
					<tr><td class="thick">Fuselage</td><td>{fuselage_weight} kg</td></tr>
					<tr><td class="thick">Lest fixe</td><td>{fix_ballast_weight} kg</td></tr>
				</table>
			</td>
		</tr>
	</table>

	<!-- Valeurs calculées -->
	<table id="outputs" class="two-columns">
		<tr>
			<th><h2>Centrage calculé</h2></th>
			<th><h2>Valeurs retenues / Etiquette cabine</h2></th>
		</tr>
		<tr>
			<td class="p20">
				<table class="standard">
					<tr><td class="w150 thick">Masse à vide équipée MVE</td><td>{mve} kg</td></tr>
					<tr><td class="w150 thick">Masse à vide des élements non portants (MVENP)</td><td>{mvenp} kg</td></tr>
					<tr><td class="w150 thick">Charge variable max</td><td>{cv_max} kg</td></tr>
					<tr><td class="w150 thick">Charge utile max</td><td>{cu_max} kg</td></tr>
					<tr><td class="w150 thick">Distance du CG à la référence (X0)</td><td>{x0} mm</td></tr>
					<tr><td class="w150 thick">Masse mini pilot avant calculé</td><td>{pilot_av_mini} kg</td></tr>
					<tr><td class="w150 thick">Masse maxi Pilot avant calculé</td><td>{pilot_av_max} kg</td></tr>
				</table>
			</td>
			<td class="p20">
				<table class="standard">
					<tr><td class="thick">Masse mini pilote avant</td><td>{p_min}</td></tr>
					<tr><td class="thick">Masse maxi pilote avant</td><td>{p_max}</td></tr>
					<tr><td class="thick">Charge utile</td><td>{cu} kg</td></tr>
				</table>
				<p>{warning}</p>
			</td>
			</td>
		</tr>
	</table>

	<!-- Inventaire -->
	<pdf:nextpage>
	<h1>Fiche de Pesée {reg}</h1>
	<h2>Inventaire des équipements présents lors de la pesée</h2>
	<p class="separator"></p>
	{inventory}
</body>
"""

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

@st.dialog("Imprimer la fiche de pesée")
def handle_print_weighing_sheet(weighing, current_glider):

	def inventory_as_html(glider):
		html= '<table class="standard"><tr><th>Instrument</th><th>Marque</th><th>Type</th><th>N°</th><th>Date</th><th>Position</th></tr>'
		for instrument in glider.instruments:
			if instrument.on_board:
				html += '<tr><td> {} </td><td> {} </td><td> {} </td><td> {} </td><td>{}</td><td> {} </td></tr>'.format(
					instrument.instrument,
					instrument.brand,
					instrument.type,
					instrument.number,
					instrument.date if instrument.date else '__/__/____',
					instrument.seat)
		return html + '</table>'
	
	st.markdown("""<style>div[role="dialog"]:has(.big-dialog) {width: 90vw;}</style>""", unsafe_allow_html=True)
	st.html("<span class='big-dialog'></span>")

	# DATUM image in base64
	img_to_load = list(DATUMS.values())[current_glider.datum-1]['image']
	with open(img_to_load, "rb") as imgFile:
		contents = imgFile.read()
		imgData  = base64.b64encode(contents).decode("utf-8")

	# Generate the PDF
	output = io.BytesIO()
	maxPilotWeight, idx_max = min_with_index(current_glider.pilot_av_maxi(),current_glider.cu_max() , current_glider.cv_max(), current_glider.limits.mm_harnais)
	minPilotWeight, idx_min = max_with_index(current_glider.limits.weight_min_pilot, current_glider.pilot_av_mini())
	warning_msg = 'Charge utile de <b>{}</b> kg dans le respect des limitations de masse de centrage et de siège à <b>{}</b> kg'.format(current_glider.cu(), current_glider.limits.mm_harnais)

	html_body = html_body_template.format(
		reg=current_glider.registration,
		brand=current_glider.brand,
		model=current_glider.model,
		serial_number=current_glider.serial_number,
		weighing_date=weighing.date.strftime('%d/%m/%Y'),
		p1=weighing.p1,
		p2=weighing.p2,
		A=weighing.A,
		D=weighing.D,
		mmwp=current_glider.limits.mmwp,
		mmwv=current_glider.limits.mmwv,
		mmenp=current_glider.limits.mmenp,
		mm_harnais=current_glider.limits.mm_harnais,
		front_centering=current_glider.limits.front_centering,
		rear_centering=current_glider.limits.rear_centering,
		arm_front_pilot=current_glider.arms.arm_front_pilot,
		arm_rear_pilot=current_glider.arms.arm_rear_pilot,
		arm_waterballast=current_glider.arms.arm_waterballast,
		arm_front_ballast=current_glider.arms.arm_front_ballast,
		arm_rear_watterballast_or_ballast=current_glider.arms.arm_rear_watterballast_or_ballast,
		image=imgData,
		datum_label = current_glider.datum_label,
		wedge = current_glider.wedge,
		wedge_position = current_glider.wedge_position,
		right_wing_weight=weighing.right_wing_weight,
		left_wing_weight=weighing.left_wing_weight,
		tail_weight=weighing.tail_weight,
		fuselage_weight=weighing.fuselage_weight,
		fix_ballast_weight=weighing.fix_ballast_weight,
		mve=weighing.mve(),
		mvenp=weighing.mvenp(),
		cv_max=current_glider.cv_max(),
		cu_max=current_glider.cu_max(),
		x0=current_glider.empty_arm(),
		pilot_av_mini=current_glider.pilot_av_mini(),
		pilot_av_max=current_glider.pilot_av_maxi(),
		p_min ='{} kg <span>({})</span>'.format(minPilotWeight, MAX_LIMITS_BY[idx_min]),
		p_max='{} kg <span>({})</span>'.format(maxPilotWeight, MIN_LIMITS_BY[idx_max]),
		cu=current_glider.cu(),
		warning=warning_msg,
		today=datetime.now().strftime('%d/%m/%Y'),
		inventory=inventory_as_html(current_glider)
	)
	html = '<html>' + html_head_template + html_body + '</html>'
	pisa.CreatePDF(html, dest=output)

	# Display the pdf
	base64_pdf = base64.b64encode(output.getbuffer()).decode("utf-8")
	pdf_display =f'<embed src="data:application/pdf;base64,{base64_pdf}" width="100%" height="800" type="application/pdf"></embed>'
	# pdf_display =f'<iframe src="data:application/pdf;base64,{base64_pdf}" width="100%" height="800" type="application/pdf"></iframe>'
	st.markdown(pdf_display, unsafe_allow_html=True)

	if st.button("ok"):
		# st.session_state.vote = {"item": item, "reason": reason}
		st.rerun()
		pass

def min_with_index(*args):
	min_value = min(args)
	return min_value, args.index(min_value)

MIN_LIMITS_BY=['',' Limité par les élements non portant', 'Limité par la charge maximun', 'Limité par les harnais']

def max_with_index(*args):
	max_value = max(args)
	return max_value, args.index(max_value)

MAX_LIMITS_BY=['Manuel de vol','Calculé']

def weighing_sheet_footer_single_seat(weighing, current_glider):
	maxPilotWeight, idx_max = min_with_index(current_glider.pilot_av_maxi(),current_glider.cu_max() , current_glider.cv_max(), current_glider.limits.mm_harnais)
	minPilotWeight, idx_min = max_with_index(current_glider.limits.weight_min_pilot, current_glider.pilot_av_mini())

	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('Monoplace',)
			st.write('Masse mini Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_mini()))
			st.write('Masse maxi Pilot calculé: :green[{}] kg'.format(current_glider.pilot_av_maxi()))
		with col2:
			st.write('Etiquette cabine / Valeurs retenues')
			st.write('Masse mini Pilot :green[{}] kg, ({})'.format(minPilotWeight, MAX_LIMITS_BY[idx_min]))
			st.write('Masse maxi Pilot :green[{}] kg, ({})'.format(maxPilotWeight, MIN_LIMITS_BY[idx_max]))

			st.info('Charge utile de :green[{}] kg dans le respect des limitations de masse de centrage et de siège à :green[{}] kg'
				.format(current_glider.cu(), current_glider.limits.mm_harnais), icon=':material/info:')

def weighing_sheet_footer_double_seat(weighing, current_glider):
	maxPilotWeight, idx_max = min_with_index(current_glider.pilot_av_maxi(),current_glider.cu_max() , current_glider.cv_max(), current_glider.limits.mm_harnais)
	minPilotWeight, idx_min = max_with_index(current_glider.limits.weight_min_pilot, current_glider.pilot_av_mini())
	minPilotWeightDuo, idx_min_duo = max_with_index(current_glider.limits.weight_min_pilot, current_glider.pilot_av_mini_duo())

	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('En monoplace',)
			st.write('Masse mini pilote calculé: :green[{}] kg'.format(current_glider.pilot_av_mini()))
			st.write('Masse maxi pilote calculé: :green[{}] kg'.format(current_glider.pilot_av_maxi()))			
		with col2:
			st.write('Etiquette cabine / Valeurs retenues')
			st.write('Masse mini pilote :green[{}] kg, ({})'.format(minPilotWeight, MAX_LIMITS_BY[idx_min]))
			st.write('Masse maxi pilote :green[{}] kg, ({})'.format(maxPilotWeight, MIN_LIMITS_BY[idx_max]))

	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('En biplace',)
			# st.write('Masse mini pilote avant calculé: :green[{}] kg'.format(current_glider.pilot_av_mini()))
			st.write('Masse mini pilote avant calculé: :green[{}] kg'.format(current_glider.pilot_av_mini_duo()))
			st.write('Masse maxi pilote avant calculé: :green[{}] kg'.format(current_glider.pilot_av_maxi()))
			
		with col2:
			st.write('Etiquette cabine / Valeurs retenues')
			# st.write('Masse mini Pilot :green[{}] kg'.format(current_glider.limits.weight_min_pilot))
			# st.write('Masse maxi Pilot :green[{}] kg'.format(current_glider.limits.mm_harnais))
			st.write('Masse mini pilote avant :green[{}] kg, ({})'.format(minPilotWeightDuo, MAX_LIMITS_BY[idx_min_duo]))
			st.write('Masse maxi pilote avant :green[{}] kg, ({})'.format(maxPilotWeight, MIN_LIMITS_BY[idx_max]))

			st.info('Charge utile de :green[{}] kg dans le respect des limitations de masse de centrage et de siège à :green[{}] kg'
				.format(current_glider.cu(), current_glider.limits.mm_harnais), icon=':material/info:')

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
			st.metric(label='Charge utile en kg', value=current_glider.cu())

		with col2:
			st.metric('Charge variable max (kg)', current_glider.cv_max())
			st.metric('Charge utile max (kg)', current_glider.cu_max())
			st.metric('X0 (mm)', current_glider.empty_arm())

		if current_glider.single_seat:
			weighing_sheet_footer_single_seat(weighing, current_glider)
		else:
			weighing_sheet_footer_double_seat(weighing, current_glider)

				# div[data-testid="stDialog"] div[role="dialog"]:has(.big-dialog) {

		if print and st.button('Imprime la fiche de pesée', type='primary', icon=':material/print:'):
			handle_print_weighing_sheet(weighing, current_glider)
	else:
		st.warning('Aucune pesée sélectionnée', icon=':material/warning:')
