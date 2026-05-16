
from datetime import datetime
import streamlit as st
import logging

import io
import base64
from xhtml2pdf import pisa

from frontend.gliders import DATUMS

logger = logging.getLogger(__name__)

def _glider_to_dict(glider) -> dict:
	"""Convert a Glider object to dict format expected by weighing sheet functions."""
	if isinstance(glider, dict):
		return glider
	try:
		limits_dict = {
			'pilot_av_mini': glider.pilot_av_mini(),
			'pilot_av_max': glider.pilot_av_maxi(),
			'pilot_av_mini_duo': glider.pilot_av_mini_duo() if not glider.single_seat else 0,
			'cu': glider.cu(),
			'cu_max': glider.cu_max(),
			'cv_max': glider.cv_max(),
			'mm_harnais': glider.limits.mm_harnais if glider.limits else 0,
			'weight_min_pilot': glider.limits.weight_min_pilot if glider.limits else 0,
			'empty_arm': glider.empty_arm(),
		}
	except Exception:
		limits_dict = {}
	try:
		arms_dict = {
			'arm_front_pilot': glider.arms.arm_front_pilot if glider.arms else 0,
			'arm_rear_pilot': glider.arms.arm_rear_pilot if glider.arms else 0,
			'arm_waterballast': glider.arms.arm_waterballast if glider.arms else 0,
			'arm_front_ballast': glider.arms.arm_front_ballast if glider.arms else 0,
			'arm_rear_watterballast_or_ballast': glider.arms.arm_rear_watterballast_or_ballast if glider.arms else 0,
			'arm_instruments_panel': glider.arms.arm_instruments_panel if glider.arms else 0,
		}
	except Exception:
		arms_dict = {}
	datum_val = glider.datum.value if hasattr(glider.datum, 'value') else int(glider.datum)
	instruments = glider.instruments if hasattr(glider, 'instruments') else []
	to_dict_method = getattr(instruments, 'to_dict', None)
	if callable(to_dict_method):
		instruments = to_dict_method('records')
	return {
		'single_seat': glider.single_seat,
		'datum': datum_val,
		'instruments': instruments,
		'limits': limits_dict,
		'arms': arms_dict,
		'registration': glider.registration,
		'model': glider.model,
		'brand': glider.brand,
	}

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
		p1_val = weighing.get('p1') if isinstance(weighing, dict) else weighing.p1
		p2_val = weighing.get('p2') if isinstance(weighing, dict) else weighing.p2
		A_val = weighing.get('A') if isinstance(weighing, dict) else weighing.A
		D_val = weighing.get('D') if isinstance(weighing, dict) else weighing.D
		
		p1 = st.text_input('P1 (kg)', value=p1_val, disabled=True)
		p2 = st.text_input('P2 (kg)', value=p2_val, disabled=True)
		A = st.text_input('A (mm)', value=A_val, disabled=True)
		D = st.text_input('D (mm)', value=D_val, disabled=True)
	
	with col2:
		right_wing_val = weighing.get('right_wing_weight') if isinstance(weighing, dict) else weighing.right_wing_weight
		left_wing_val = weighing.get('left_wing_weight') if isinstance(weighing, dict) else weighing.left_wing_weight
		tail_val = weighing.get('tail_weight') if isinstance(weighing, dict) else weighing.tail_weight
		fuselage_val = weighing.get('fuselage_weight') if isinstance(weighing, dict) else weighing.fuselage_weight
		fix_ballast_val = weighing.get('fix_ballast_weight') if isinstance(weighing, dict) else weighing.fix_ballast_weight
		
		right_wing_weight = st.text_input('Aile droite (kg)', value=right_wing_val, disabled=True)
		left_wing_weight = st.text_input('Aile gauche (kg)', value=left_wing_val, disabled=True)
		tail_weight = st.text_input('Empennage H (kg)', value=tail_val, disabled=True)
		fuselage_weight = st.text_input('Fuselage (kg)', value=fuselage_val, disabled=True)
		fix_ballast_weight = st.text_input('Masse du lest fixe (kg)', value=fix_ballast_val, disabled=True)

@st.dialog("Imprimer la fiche de pesée")
def handle_print_weighing_sheet(weighing, current_glider):
	current_glider = _glider_to_dict(current_glider)

	def inventory_as_html(glider_dict):
		instruments = glider_dict.get('instruments', [])
		html = '<table class="standard"><tr><th>Instrument</th><th>Marque</th><th>Type</th><th>N°</th><th>Date</th><th>Position</th></tr>'
		for instrument in instruments:
			if instrument.get('on_board', False):
				html += '<tr><td> {} </td><td> {} </td><td> {} </td><td> {} </td><td>{}</td><td> {} </td></tr>'.format(
					instrument.get('instrument', ''),
					instrument.get('brand', ''),
					instrument.get('type', ''),
					instrument.get('number', ''),
					instrument.get('date') if instrument.get('date') else '__/__/____',
					instrument.get('seat', ''))
		return html + '</table>'
	
	st.markdown("""<style>div[role="dialog"]:has(.big-dialog) {width: 90vw;}</style>""", unsafe_allow_html=True)
	st.html("<span class='big-dialog'></span>")

	try:
		datum_idx = current_glider.get('datum', 1) - 1
		img_to_load = list(DATUMS.values())[datum_idx]['image']
		with open(img_to_load, "rb") as imgFile:
			contents = imgFile.read()
			imgData = base64.b64encode(contents).decode("utf-8")

		limits = current_glider.get('limits', {})
		arms = current_glider.get('arms', {})
		
		output = io.BytesIO()
		
		weighing_date = weighing['date'].strftime('%d/%m/%Y') if isinstance(weighing['date'], datetime) else weighing['date']
		p1 = weighing.get('p1', 0)
		p2 = weighing.get('p2', 0)
		A = weighing.get('A', 0)
		D = weighing.get('D', 0)
		right_wing_weight = weighing.get('right_wing_weight', 0)
		left_wing_weight = weighing.get('left_wing_weight', 0)
		tail_weight = weighing.get('tail_weight', 0)
		fuselage_weight = weighing.get('fuselage_weight', 0)
		fix_ballast_weight = weighing.get('fix_ballast_weight', 0)
		
		mve = p1 + p2 + right_wing_weight + left_wing_weight + tail_weight + fuselage_weight + fix_ballast_weight
		mvenp = right_wing_weight + left_wing_weight + tail_weight + fuselage_weight
		
		maxPilotWeight = limits.get('mm_harnais', 100)
		minPilotWeight = limits.get('weight_min_pilot', 50)
		
		mmwp = limits.get('mmwp', 0)
		mmwv = limits.get('mmwv', 0)
		mmenp = limits.get('mmenp', 0)
		mm_harnais = limits.get('mm_harnais', 0)
		front_centering = limits.get('front_centering', 0)
		rear_centering = limits.get('rear_centering', 0)
		
		arm_front_pilot = arms.get('arm_front_pilot', 0)
		arm_rear_pilot = arms.get('arm_rear_pilot', 0)
		arm_waterballast = arms.get('arm_waterballast', 0)
		arm_front_ballast = arms.get('arm_front_ballast', 0)
		arm_rear_watterballast_or_ballast = arms.get('arm_rear_watterballast_or_ballast', 0)
		
		cv_max = limits.get('cv_max', 0)
		cu_max = limits.get('cu_max', 0)
		x0 = limits.get('empty_arm', 0)
		pilot_av_mini = limits.get('pilot_av_mini', 0)
		pilot_av_max = limits.get('pilot_av_max', 0)
		cu = limits.get('cu', 0)
		
		warning_msg = f'Charge utile de <b>{cu}</b> kg dans le respect des limitations de masse de centrage et de siège à <b>{mm_harnais}</b> kg'
		
		html_body = html_body_template.format(
			reg=current_glider.get('registration', ''),
			brand=current_glider.get('brand', ''),
			model=current_glider.get('model', ''),
			serial_number=current_glider.get('serial_number', ''),
			weighing_date=weighing_date,
			p1=p1,
			p2=p2,
			A=A,
			D=D,
			mmwp=mmwp,
			mmwv=mmwv,
			mmenp=mmenp,
			mm_harnais=mm_harnais,
			front_centering=front_centering,
			rear_centering=rear_centering,
			arm_front_pilot=arm_front_pilot,
			arm_rear_pilot=arm_rear_pilot,
			arm_waterballast=arm_waterballast,
			arm_front_ballast=arm_front_ballast,
			arm_rear_watterballast_or_ballast=arm_rear_watterballast_or_ballast,
			image=imgData,
			datum_label=current_glider.get('datum_label', ''),
			wedge=current_glider.get('wedge', ''),
			wedge_position=current_glider.get('wedge_position', ''),
			right_wing_weight=right_wing_weight,
			left_wing_weight=left_wing_weight,
			tail_weight=tail_weight,
			fuselage_weight=fuselage_weight,
			fix_ballast_weight=fix_ballast_weight,
			mve=mve,
			mvenp=mvenp,
			cv_max=cv_max,
			cu_max=cu_max,
			x0=x0,
			pilot_av_mini=pilot_av_mini,
			pilot_av_max=pilot_av_max,
			p_min=f'{minPilotWeight} kg <span>({MAX_LIMITS_BY[0]})</span>',
			p_max=f'{maxPilotWeight} kg <span>({MIN_LIMITS_BY[0]})</span>',
			cu=cu,
			warning=warning_msg,
			today=datetime.now().strftime('%d/%m/%Y'),
			inventory=inventory_as_html(current_glider)
		)
		html = '<html>' + html_head_template + html_body + '</html>'
		pisa.CreatePDF(html, dest=output)

		base64_pdf = base64.b64encode(output.getbuffer()).decode("utf-8")
		pdf_display = f'<embed src="data:application/pdf;base64,{base64_pdf}" width="100%" height="800" type="application/pdf"></embed>'
		st.markdown(pdf_display, unsafe_allow_html=True)

		if st.button("ok"):
			st.rerun()
	except Exception as e:
		st.error(f'Erreur lors de la génération du PDF: {str(e)}')
		logger.error(f'Error generating PDF: {e}')

def min_with_index(*args):
	min_value = min(args)
	return min_value, args.index(min_value)

MIN_LIMITS_BY=['',' Limité par les élements non portant', 'Limité par la charge maximun', 'Limité par les harnais']

def max_with_index(*args):
	max_value = max(args)
	return max_value, args.index(max_value)

MAX_LIMITS_BY=['Manuel de vol','Calculé']

def weighing_sheet_footer_single_seat(current_glider):
	current_glider = _glider_to_dict(current_glider)
	limits = current_glider.get('limits', {})
	
	pilot_av_mini = limits.get('pilot_av_mini', 0)
	pilot_av_max = limits.get('pilot_av_max', 0)
	cu = limits.get('cu', 0)
	mm_harnais = limits.get('mm_harnais', 0)
	weight_min_pilot = limits.get('weight_min_pilot', 0)

	maxPilotWeight, idx_max = min_with_index(pilot_av_max, limits.get('cu_max', 0), limits.get('cv_max', 0), mm_harnais)
	minPilotWeight, idx_min = max_with_index(weight_min_pilot, pilot_av_mini)

	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('Monoplace',)
			st.write('Masse mini Pilot calculé: :green[{}] kg'.format(pilot_av_mini))
			st.write('Masse maxi Pilot calculé: :green[{}] kg'.format(pilot_av_max))
		with col2:
			st.write('Etiquette cabine / Valeurs retenues')
			st.write('Masse mini Pilot :green[{}] kg, ({})'.format(minPilotWeight, MAX_LIMITS_BY[idx_min]))
			st.write('Masse maxi Pilot :green[{}] kg, ({})'.format(maxPilotWeight, MIN_LIMITS_BY[idx_max]))

			st.info('Charge utile de :green[{}] kg dans le respect des limitations de masse de centrage et de siège à :green[{}] kg'
				.format(cu, mm_harnais), icon=':material/info:')

def weighing_sheet_footer_double_seat(current_glider):
	current_glider = _glider_to_dict(current_glider)
	limits = current_glider.get('limits', {})
	
	pilot_av_mini = limits.get('pilot_av_mini', 0)
	pilot_av_max = limits.get('pilot_av_max', 0)
	pilot_av_mini_duo = limits.get('pilot_av_mini_duo', 0)
	cu = limits.get('cu', 0)
	mm_harnais = limits.get('mm_harnais', 0)
	weight_min_pilot = limits.get('weight_min_pilot', 0)

	maxPilotWeight, idx_max = min_with_index(pilot_av_max, limits.get('cu_max', 0), limits.get('cv_max', 0), mm_harnais)
	minPilotWeight, idx_min = max_with_index(weight_min_pilot, pilot_av_mini)
	minPilotWeightDuo, idx_min_duo = max_with_index(weight_min_pilot, pilot_av_mini_duo)

	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('En monoplace',)
			st.write('Masse mini pilote calculé: :green[{}] kg'.format(pilot_av_mini))
			st.write('Masse maxi pilote calculé: :green[{}] kg'.format(pilot_av_max))			
		with col2:
			st.write('Etiquette cabine / Valeurs retenues')
			st.write('Masse mini pilote :green[{}] kg, ({})'.format(minPilotWeight, MAX_LIMITS_BY[idx_min]))
			st.write('Masse maxi pilote :green[{}] kg, ({})'.format(maxPilotWeight, MIN_LIMITS_BY[idx_max]))

	with st.container(border=True):
		col1, col2 = st.columns(2)
		with col1:
			st.write('En biplace',)
			st.write('Masse mini pilote avant calculé: :green[{}] kg'.format(pilot_av_mini_duo))
			st.write('Masse maxi pilote avant calculé: :green[{}] kg'.format(pilot_av_max))
			
		with col2:
			st.write('Etiquette cabine / Valeurs retenues')
			st.write('Masse mini pilote avant :green[{}] kg, ({})'.format(minPilotWeightDuo, MAX_LIMITS_BY[idx_min_duo]))
			st.write('Masse maxi pilote avant :green[{}] kg, ({})'.format(maxPilotWeight, MIN_LIMITS_BY[idx_max]))

			st.info('Charge utile de :green[{}] kg dans le respect des limitations de masse de centrage et de siège à :green[{}] kg'
				.format(cu, mm_harnais), icon=':material/info:')

def display_detail_weighing(weighing, current_glider, print=False):
	current_glider = _glider_to_dict(current_glider)
	if weighing is not None:
		weighing_id = weighing.get('id') if isinstance(weighing, dict) else weighing.id
		weighing_date = weighing.get('date') if isinstance(weighing, dict) else weighing.date
		
		if isinstance(weighing_date, str):
			weighing_date = datetime.fromisoformat(weighing_date).date()

		weighing_date_label = weighing_date.strftime('%d/%m/%Y') if weighing_date is not None else 'date inconnue'
		st.subheader('Détails de la pesée #{} du {}'.format(weighing_id, weighing_date_label))
		weighing_sheet(weighing)

		limits = current_glider.get('limits', {})
		
		p1 = weighing.get('p1', 0) if isinstance(weighing, dict) else weighing.p1
		p2 = weighing.get('p2', 0) if isinstance(weighing, dict) else weighing.p2
		right_wing = weighing.get('right_wing_weight', 0) if isinstance(weighing, dict) else weighing.right_wing_weight
		left_wing = weighing.get('left_wing_weight', 0) if isinstance(weighing, dict) else weighing.left_wing_weight
		tail = weighing.get('tail_weight', 0) if isinstance(weighing, dict) else weighing.tail_weight
		fuselage = weighing.get('fuselage_weight', 0) if isinstance(weighing, dict) else weighing.fuselage_weight
		fix_ballast = weighing.get('fix_ballast_weight', 0) if isinstance(weighing, dict) else weighing.fix_ballast_weight
		
		mve = p1 + p2 + right_wing + left_wing + tail + fuselage + fix_ballast
		mvenp = right_wing + left_wing + tail + fuselage
		
		col1, col2 = st.columns(2)
		with col1:
			st.metric(label="Masse à vide équipée MVE (kg)", value=mve)
			st.metric(label='Masse à vide des élements non portants (MVENP) en kg', value=mvenp)
			st.metric(label='Charge utile en kg', value=limits.get('cu', 0))

		with col2:
			st.metric('Charge variable max (kg)', limits.get('cv_max', 0))
			st.metric('Charge utile max (kg)', limits.get('cu_max', 0))
			st.metric('X0 (mm)', limits.get('empty_arm', 0))

		single_seat = current_glider.get('single_seat', True)
		if single_seat:
			weighing_sheet_footer_single_seat(current_glider)
		else:
			weighing_sheet_footer_double_seat(current_glider)

		if print and st.button('Imprime la fiche de pesée', type='primary', icon=':material/print:'):
			handle_print_weighing_sheet(weighing, current_glider)
	else:
		st.warning('Aucune pesée sélectionnée', icon=':material/warning:')
