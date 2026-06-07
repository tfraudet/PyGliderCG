"""PDF generation service for glider weighing sheets."""

from __future__ import annotations

import base64
import html
import logging
import mimetypes
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Any, cast

from xhtml2pdf import pisa

from backend.models.glider import Glider, Weighing
from backend.schemas.weighing import (
    GliderArmsSchema,
    GliderLimitsSchema,
    WeighingDataSchema,
)
from backend.services.weighing import WeighingCalculationService

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOGO_PATH = PROJECT_ROOT / 'web' / 'public' / 'img' / 'acph-logo-v2017-gray.png'
DATUM_IMAGE_PATHS = {
	1: PROJECT_ROOT / 'web' / 'public' / 'img' / 'datum-hd-1.png',
	2: PROJECT_ROOT / 'web' / 'public' / 'img' / 'datum-hd-2.png',
	3: PROJECT_ROOT / 'web' / 'public' / 'img' / 'datum-hd-4.png',
	4: PROJECT_ROOT / 'web' / 'public' / 'img' / 'datum-hd-snc34c.png',
}

HTML_TEMPLATE = """
<html>
<head>
<style>
	@page {{
		size: a4 portrait;
		@frame header_frame {{
			-pdf-frame-content: header_content;
			left: 50pt;
			width: 512pt;
			top: 50pt;
			height: 40pt;
		}}
		@frame content_frame {{
			left: 50pt;
			width: 512pt;
			top: 90pt;
			height: 662pt;
		}}
		@frame footer_frame {{
			-pdf-frame-content: footer_content;
			left: 50pt;
			width: 512pt;
			top: 772pt;
			height: 20pt;
		}}
	}}

	body {{
		font-family: Helvetica, Arial, sans-serif;
		color: #111111;
	}}

	h1, h2 {{
		text-align: center;
		margin: 0;
	}}

	h1 {{
		font-size: 13pt;
		margin-bottom: 6pt;
	}}

	h2 {{
		font-size: 10.5pt;
		margin-bottom: 6pt;
	}}

	p {{
		margin: 0 0 8pt 0;
	}}

	#header_content {{
		text-align: left;
	}}

	#footer_content {{
		font-size: 8pt;
		color: #444444;
		text-align: right;
	}}

	.standard {{
		border-collapse: collapse;
		border: 1px solid #000000;
		padding-left: 0;
		padding-right: 0;
	}}

	.standard th,
	.standard td {{
		border: 1px solid #000000;
		padding-top: 2pt;
		padding-left: 3pt;
		padding-right: 3pt;
		text-align: center;
		vertical-align: middle;
	}}

	.standard th {{
		background-color: #ffffff;
		font-weight: bold;
	}}

	.thick {{
		font-weight: bold;
	}}

	.one-column {{
		width: 100%;
		padding-left: 40pt;
		padding-right: 40pt;
	}}

	.two-columns {{
		width: 100%;
	}}

	.two-columns td {{
		vertical-align: top;
	}}

	.p00 {{
		padding-left: 0;
		padding-right: 0;
	}}

	.p20 {{
		padding-left: 20pt;
		padding-right: 20pt;
	}}

	.w100 {{
		width: 50pt;
	}}

	.w150 {{
		width: 150pt;
	}}

	#configuration {{
		margin-bottom: 20pt;
	}}

	#inputs > tbody > tr > td,
	#outputs > tbody > tr > td {{
		vertical-align: top;
	}}

	#inputs {{
		margin-bottom: 20pt;
	}}

	#cartouche-block {{
		margin-bottom: 10pt;
	}}

	.cartouche {{
		font-size: 6.5pt;
		table-layout: fixed;
	}}

	.cartouche th,
	.cartouche td {{

	}}

	.inventory-note {{
		font-style: italic;
		color: #555555;
		text-align: center;
		padding: 8pt;
	}}

	.info-box {{
		font-size: 7pt;
		line-height: 1.25;
		margin-top: 4pt;
	}}
</style>
</head>
<body>
	<div id="header_content">{logo_html}</div>
	<div id="footer_content">Edité le {generated_on} - page <pdf:pagenumber> de <pdf:pagecount></div>
	<h1>Fiche de Pesée {registration}</h1>

	<table id="cartouche-block" class="one-column">
		<tr>
			<td>
				<table class="standard cartouche" width="430">
					<tr>
						<th width="107">Immatriculation</th>
						<th width="107">Constructeur</th>
						<th width="107">Modèle</th>
						<th width="109">N° de série</th>
					</tr>
					<tr>
						<td width="107">{registration}</td>
						<td width="107">{brand}</td>
						<td width="107">{model}</td>
						<td width="109">{serial_number}</td>
					</tr>
					<tr>
						<th width="107">Date pesée</th>
						<th width="107">Mécanicien</th>
						<th width="107">Licence n°</th>
						<th width="109">Signature</th>
					</tr>
					<tr>
						<td width="107">{weighing_date}</td>
						<td width="107"></td>
						<td width="107"></td>
						<td width="109"></td>
					</tr>
				</table>
			</td>
		</tr>
	</table>

	<h2>Configuration de pesée</h2>
	<table id="configuration" class="two-columns">
		<tr>
			<td>{datum_image_html}</td>
			<td class="p00">
				<table class="standard">
					<tr><td class="w100 thick">Plan de référence</td><td>{datum_label}</td></tr>
					<tr><td class="w100 thick">Cale de référence</td><td>{wedge}</td></tr>
					<tr><td class="w100 thick">Position cale</td><td>{wedge_position}</td></tr>
				</table>
			</td>
		</tr>
	</table>

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
						<tr><td class="w150 thick">Bras de levier gueuse arrière</td><td>{arm_rear_ballast} mm</td></tr>
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

	<table id="outputs" class="two-columns">
			<tr>
				<th><h2>Centrage calculé</h2></th>
				<th><h2>Valeurs retenues / Etiquette cabine</h2></th>
			</tr>
			<tr>
				<td class="p20">
					<table class="standard">
						<tr><td class="w150 thick">Masse à vide équipée MVE</td><td>{mve} kg</td></tr>
						<tr><td class="w150 thick">Masse à vide des éléments non portants (MVENP)</td><td>{mvenp} kg</td></tr>
						<tr><td class="w150 thick">Charge variable max</td><td>{cv_max} kg</td></tr>
						<tr><td class="w150 thick">Charge utile max</td><td>{cu_max} kg</td></tr>
						<tr><td class="w150 thick">Distance du CG à la référence (X0)</td><td>{empty_arm} mm</td></tr>
                        <tr><td class="w150 thick">Masse mini pilote avant calculée</td><td>{pilot_av_mini} kg</td></tr>
						<tr><td class="w150 thick">Masse maxi pilot avant calculée</td><td>{pilot_av_maxi} kg</td></tr>
					</table>
				</td>
				<td class="p20">
					<table class="standard">
						<tr><td class="thick">Masse mini pilote avant</td><td>{retained_pilot_av_min}</td></tr>
						<tr><td class="thick">Masse maxi pilote avant</td><td>{retained_pilot_av_max}</td></tr>
						<tr><td class="thick">Charge utile</td><td>{cu} kg</td></tr>
					</table>
					<div class="info-box">{useful_load_message}</div>
				</td>
			</tr>
	</table>

	<pdf:nextpage />
	<h1>Fiche de Pesée {registration}</h1>
	<h2>Inventaire des équipements présents lors de la pesée</h2>
	<div class="section">{inventory_html}</div>
</body>
</html>
"""

PilotLimitValue = tuple[float | None, str | None]

class WeighingPdfService:  # pylint: disable=too-few-public-methods
    """Generate the official weighing sheet as PDF bytes."""

    @classmethod
    def render_pdf(cls, glider: Glider, weighing: Weighing) -> bytes:
        """Render a single weighing sheet PDF."""
        if glider.limits is None:
            raise ValueError('Glider limits data is not configured')
        if glider.arms is None:
            raise ValueError('Glider arms data is not configured')

        limits = GliderLimitsSchema(
            mmwp=glider.limits.mmwp,
            mmwv=glider.limits.mmwv,
            mmenp=glider.limits.mmenp,
            mm_harnais=glider.limits.mm_harnais,
            weight_min_pilot=glider.limits.weight_min_pilot,
            front_centering=glider.limits.front_centering,
            rear_centering=glider.limits.rear_centering,
        )
        arms = GliderArmsSchema(
            arm_front_pilot=glider.arms.arm_front_pilot,
            arm_rear_pilot=glider.arms.arm_rear_pilot,
            arm_waterballast=glider.arms.arm_waterballast,
            arm_front_ballast=glider.arms.arm_front_ballast,
            arm_rear_watterballast_or_ballast=glider.arms.arm_rear_watterballast_or_ballast,
            arm_gas_tank=glider.arms.arm_gas_tank,
            arm_instruments_panel=glider.arms.arm_instruments_panel,
        )
        calculation = WeighingCalculationService.calculate_weighing(
            glider.registration,
            WeighingDataSchema(
                p1=weighing.p1,
                p2=weighing.p2,
                A=weighing.A,
                D=weighing.D,
                right_wing_weight=weighing.right_wing_weight,
                left_wing_weight=weighing.left_wing_weight,
                tail_weight=weighing.tail_weight,
                fuselage_weight=weighing.fuselage_weight,
                fix_ballast_weight=weighing.fix_ballast_weight,
            ),
            limits,
            arms,
            glider.datum,
            glider.pilot_position,
        )
        pilot_limits = cast(
            dict[str, float | None],
            # pylint: disable=no-member
            cast(Any, calculation.pilot_limits).model_dump(
                include={'min_weight', 'min_weight_duo', 'max_weight'}
            ),
        )

        retained_min = cls._get_retained_pilot_min(
            glider.limits.weight_min_pilot,
            pilot_limits['min_weight'],
        )
        retained_duo_min = cls._get_retained_pilot_min(
            glider.limits.weight_min_pilot,
            pilot_limits['min_weight_duo'],
        )
        retained_max = cls._get_retained_pilot_max(
            pilot_limits['max_weight'],
            calculation.cu_max,
            calculation.cv_max,
            glider.limits.mm_harnais,
        )

        html_content = HTML_TEMPLATE.format(
            logo_html=cls._build_image_tag(LOGO_PATH, 'Logo ACPH', width=62),
            generated_on=cls._escape(datetime.now().strftime('%d/%m/%Y')),
            registration=cls._escape(glider.registration),
            brand=cls._escape(glider.brand),
            model=cls._escape(glider.model),
            serial_number=cls._escape(glider.serial_number),
            weighing_date=cls._escape(weighing.date.strftime('%d/%m/%Y')),
            datum_image_html=cls._build_image_tag(
                DATUM_IMAGE_PATHS.get(glider.datum),
                'Schéma du plan de référence',
                width=240,
            ),
            datum_label=cls._escape(glider.datum_label),
            wedge=cls._escape(glider.wedge),
            wedge_position=cls._escape(glider.wedge_position),
            mmwp=cls._format_number(glider.limits.mmwp),
            mmwv=cls._format_number(glider.limits.mmwv),
            mmenp=cls._format_number(glider.limits.mmenp),
            mm_harnais=cls._format_number(glider.limits.mm_harnais),
            front_centering=cls._format_number(
                glider.limits.front_centering,
                decimals=0,
            ),
            rear_centering=cls._format_number(
                glider.limits.rear_centering,
                decimals=0,
            ),
            arm_front_pilot=cls._format_number(
                glider.arms.arm_front_pilot,
                decimals=0,
            ),
            arm_rear_pilot=cls._format_number(
                glider.arms.arm_rear_pilot,
                decimals=0,
            ),
            arm_waterballast=cls._format_number(
                glider.arms.arm_waterballast,
                decimals=0,
            ),
            arm_front_ballast=cls._format_number(
                glider.arms.arm_front_ballast,
                decimals=0,
            ),
            arm_rear_ballast=cls._format_number(
                glider.arms.arm_rear_watterballast_or_ballast,
                decimals=0,
            ),
            p1=cls._format_number(weighing.p1),
            p2=cls._format_number(weighing.p2),
            A=cls._format_number(weighing.A, decimals=0),
            D=cls._format_number(weighing.D, decimals=0),
            right_wing_weight=cls._format_number(weighing.right_wing_weight),
            left_wing_weight=cls._format_number(weighing.left_wing_weight),
            tail_weight=cls._format_number(weighing.tail_weight),
            fuselage_weight=cls._format_number(weighing.fuselage_weight),
            fix_ballast_weight=cls._format_number(weighing.fix_ballast_weight),
            mve=cls._format_number(calculation.mve),
            mvenp=cls._format_number(calculation.mvenp),
            cv_max=cls._format_number(calculation.cv_max),
            cu_max=cls._format_number(calculation.cu_max),
            empty_arm=cls._format_number(
                calculation.empty_arm,
                decimals=0,
            ),
            pilot_av_mini=cls._format_number(pilot_limits["min_weight"]),
            pilot_av_maxi=cls._format_number(pilot_limits['max_weight']),
            retained_pilot_av_min = f'{cls._format_number(retained_min[0])} kg ({cls._escape(retained_min[1])})',
            retained_pilot_av_max = f'{cls._format_number(retained_max[0])} kg ({cls._escape(retained_max[1])})',

            cu=cls._format_number(calculation.cu),
            useful_load_message=cls._escape(
                f'Charge utile de {cls._format_number(calculation.cu)} kg '
                f'dans le respect des limitations de masse, de centrage '
                f'et de siège à {cls._format_number(glider.limits.mm_harnais)} kg.'
            ),
            inventory_html=cls._build_inventory_html(glider),
        )

        output = BytesIO()
        pdf_status = cast(Any, pisa.CreatePDF(html_content, dest=output))
        if pdf_status.err:
            raise ValueError('Failed to generate PDF from weighing sheet template')
        return output.getvalue()

    @staticmethod
    def _escape(value: object | None) -> str:
        if value is None:
            return '—'
        text = str(value).strip()
        return html.escape(text) if text else '—'

    @staticmethod
    def _format_number(value: float | int | None, decimals: int = 1) -> str:
        if value is None:
            return '—'
        return f'{value:.{decimals}f}'

    @classmethod
    def _build_image_tag(cls, path: Path | None, alt: str, width: int) -> str:
        if path is None or not path.exists():
            logger.warning('PDF image asset missing: %s', path)
            return f'<p>{cls._escape(alt)} indisponible</p>'

        mime_type, _ = mimetypes.guess_type(path.name)
        if mime_type is None:
            mime_type = 'image/png'

        with path.open('rb') as image_file:
            encoded = base64.b64encode(image_file.read()).decode('ascii')

        return (
            f'<img src="data:{mime_type};base64,{encoded}" '
            f'width="{width}" alt="{cls._escape(alt)}" />'
        )

    @staticmethod
    def _get_retained_pilot_min(
        manual_min: float | None,
        calculated_min: float | None,
    ) -> PilotLimitValue:
        """Return the retained minimum pilot weight and its limiting reason."""
        candidates = [value for value in (manual_min, calculated_min) if value is not None]
        if not candidates:
            return (None, None)

        value = max(candidates)
        if (
            manual_min is not None
            and value == manual_min
            and (calculated_min is None or manual_min >= calculated_min)
        ):
            return (value, 'Manuel de vol')
        return (value, 'Calculé')

    @staticmethod
    def _get_retained_pilot_max(
        calculated_max: float | None,
        cu_max: float | None,
        cv_max: float | None,
        seat_limit: float | None,
    ) -> PilotLimitValue:
        """Return the retained maximum pilot weight and its limiting reason."""
        candidates = []
        if calculated_max is not None:
            candidates.append((calculated_max, None))
        if cu_max is not None:
            candidates.append((cu_max, 'Limité par les éléments non portants'))
        if cv_max is not None:
            candidates.append((cv_max, 'Limité par la charge maximun'))
        if seat_limit is not None:
            candidates.append((seat_limit, 'Limité par les harnais'))

        if not candidates:
            return (None, None)

        value, reason = min(candidates, key=lambda candidate: candidate[0])
        return (value, reason)

    @classmethod
    def _build_inventory_html(cls, glider: Glider) -> str:
        on_board_instruments = [
            instrument for instrument in glider.instruments if instrument.on_board
        ]
        if not on_board_instruments:
            return (
                '<p class="inventory-note">'
                'Aucun équipement embarqué enregistré pour cette pesée.'
                '</p>'
            )

        rows = []
        for instrument in on_board_instruments:
            rows.append(
                '<tr>'
                f'<td>{cls._escape(instrument.instrument)}</td>'
                f'<td>{cls._escape(instrument.brand)}</td>'
                f'<td>{cls._escape(instrument.type)}</td>'
                f'<td>{cls._escape(instrument.number)}</td>'
                f'<td>{cls._escape(cls._format_instrument_date(instrument.date))}</td>'
                f'<td>{cls._escape(instrument.seat)}</td>'
                '</tr>'
            )

        return (
            '<table class="standard">'
            '<tr>'
            '<th>Instrument</th>'
            '<th>Marque</th>'
            '<th>Type</th>'
            '<th>N°</th>'
            '<th>Date</th>'
            '<th>Position</th>'
            '</tr>'
            f'{"".join(rows)}'
            '</table>'
        )

    @staticmethod
    def _format_instrument_date(value: date | None) -> str:
        if value is None:
            return '__/__/____'
        return value.strftime('%d/%m/%Y')
