import pytest

from backend.services.weighing_pdf import WeighingPdfService


@pytest.mark.parametrize(
	'calculated_max, cu_max, cv_max, seat_limit, expected',
	[
		(120.0, 140.0, 150.0, 160.0, (120.0, None)),
		(140.0, 130.0, 150.0, 160.0, (130.0, 'Limité par les éléments non portants')),
		(140.0, 150.0, 130.0, 160.0, (130.0, 'Limité par la charge maximun')),
		(140.0, 150.0, 160.0, 130.0, (130.0, 'Limité par les harnais')),
	]
)
def test_get_retained_pilot_max(calculated_max, cu_max, cv_max, seat_limit, expected):
	assert WeighingPdfService._get_retained_pilot_max(calculated_max, cu_max, cv_max, seat_limit) == expected
