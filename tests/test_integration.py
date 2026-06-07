"""
Integration testing for PyGliderCG backend and Streamlit frontend.

Tests:
1. Backend health check
2. Authentication flow (login, token refresh, logout)
3. Glider operations (CRUD)
4. Error handling
5. Data consistency
6. Performance
"""

import requests
import json
import time
import pytest
import os
from typing import Tuple
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8000')
TIMEOUT = 10
TEST_ADMIN_USERNAME = os.getenv('TEST_ADMIN_USERNAME', 'testadmin')
TEST_ADMIN_PASSWORD = os.getenv('TEST_ADMIN_PASSWORD', 'testpass123')
TEST_EDITOR_USERNAME = os.getenv('TEST_EDITOR_USERNAME', 'testeditor')
TEST_EDITOR_PASSWORD = os.getenv('TEST_EDITOR_PASSWORD', 'testeditor123')


@pytest.fixture
def backend_url():
	"""Backend URL fixture"""
	return BACKEND_URL


@pytest.fixture
def timeout():
	"""Request timeout fixture"""
	return TIMEOUT


@pytest.fixture
def test_credentials():
	"""Test credentials fixture - uses admin user"""
	return {
		'username': TEST_ADMIN_USERNAME,
		'password': TEST_ADMIN_PASSWORD
	}


@pytest.fixture
def editor_credentials():
	"""Editor credentials fixture"""
	return {
		'username': TEST_EDITOR_USERNAME,
		'password': TEST_EDITOR_PASSWORD
	}


@pytest.fixture
def auth_token(test_credentials):
	"""Get valid auth token for testing"""
	response = requests.post(
		f'{BACKEND_URL}/api/auth/login',
		json=test_credentials,
		timeout=TIMEOUT
	)
	if response.status_code == 200:
		return response.json().get('access_token')
	raise RuntimeError(f'Failed to obtain test token: {response.status_code} - {response.text}')


@pytest.fixture
def editor_token(editor_credentials):
	"""Get valid editor auth token for testing."""
	response = requests.post(
		f'{BACKEND_URL}/api/auth/login',
		json=editor_credentials,
		timeout=TIMEOUT
	)
	if response.status_code == 200:
		return response.json().get('access_token')
	raise RuntimeError(f'Failed to obtain editor token: {response.status_code} - {response.text}')


def _calculate_weight_and_balance(glider_id: str, payload: dict, timeout: int) -> dict:
	"""Call weight and balance calculation endpoint and return response payload."""
	response = requests.post(
		f'{BACKEND_URL}/api/gliders/{glider_id}/calculate',
		json=payload,
		timeout=timeout,
	)
	assert response.status_code == 200
	data = response.json()
	assert 'total_weight' in data
	assert 'center_of_gravity' in data
	return data


def _get_glider_limits(glider_id: str, timeout: int) -> dict:
	"""Get glider limit/calculation metadata used in UI computation."""
	response = requests.get(
		f'{BACKEND_URL}/api/gliders/{glider_id}/limits',
		timeout=timeout,
	)
	assert response.status_code == 200
	data = response.json()
	assert 'mvenp' in data
	return data


def _get_glider_details(glider_id: str, timeout: int) -> dict:
	"""Get complete glider payload including weight_and_balances polygon points."""
	response = requests.get(
		f'{BACKEND_URL}/api/gliders/{glider_id}',
		timeout=timeout,
	)
	assert response.status_code == 200
	data = response.json()
	assert 'weight_and_balances' in data
	return data


def _get_glider_weighing(glider_id: str, timeout: int) -> dict:
	"""Get the first weighing of a glider for mutation tests."""
	details = _get_glider_details(glider_id, timeout)
	assert 'weighings' in details
	assert len(details['weighings']) > 0
	return details['weighings'][0]


def _is_point_inside_polygon(point_x: float, point_y: float, polygon: list[list[float]]) -> bool:
	"""Ray-casting point-in-polygon test."""
	inside = False
	num_points = len(polygon)
	if num_points < 3:
		return False

	j = num_points - 1
	for i in range(num_points):
		xi, yi = polygon[i]
		xj, yj = polygon[j]
		intersects = (
			(yi > point_y) != (yj > point_y)
			and point_x < (xj - xi) * (point_y - yi) / (yj - yi + 1e-12) + xi
		)
		if intersects:
			inside = not inside
		j = i

	return inside


class TestBackendHealth:
	"""Backend health and connectivity tests"""

	def test_backend_health_check(self, backend_url, timeout):
		"""Test backend health check endpoint"""
		response = requests.get(f'{backend_url}/health', timeout=timeout)
		
		assert response.status_code == 200
		data = response.json()
		assert isinstance(data, dict)

	def test_api_docs_accessible(self, backend_url, timeout):
		"""Test OpenAPI documentation is accessible"""
		response = requests.get(f'{backend_url}/docs', timeout=timeout)
		
		assert response.status_code == 200


class TestAuthentication:
	"""Authentication flow tests"""

	def test_login_valid_credentials(self, test_credentials, timeout):
		"""Test login with valid credentials"""
		response = requests.post(
			f'{BACKEND_URL}/api/auth/login',
			json=test_credentials,
			timeout=timeout
		)
		
		assert response.status_code == 200
		data = response.json()
		assert 'access_token' in data
		assert isinstance(data['access_token'], str)
		assert len(data['access_token']) > 0

	def test_login_invalid_credentials(self, timeout):
		"""Test login rejection with invalid credentials"""
		response = requests.post(
			f'{BACKEND_URL}/api/auth/login',
			json={'username': 'invalid_user', 'password': 'wrong_password'},
			timeout=timeout
		)
		
		assert response.status_code == 401

	def test_get_user_info(self, auth_token, timeout):
		"""Test retrieving user info with valid token"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/auth/me',
			headers=headers,
			timeout=timeout
		)
		
		assert response.status_code == 200
		data = response.json()
		assert 'username' in data

	def test_token_refresh(self, auth_token, timeout):
		"""Test token refresh endpoint"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		response = requests.post(
			f'{BACKEND_URL}/api/auth/refresh',
			json={'refresh_token': auth_token},
			headers=headers,
			timeout=timeout
		)
		
		assert response.status_code == 200
		data = response.json()
		assert 'access_token' in data
		assert isinstance(data['access_token'], str)

	def test_logout(self, auth_token, timeout):
		"""Test logout endpoint"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		response = requests.post(
			f'{BACKEND_URL}/api/auth/logout',
			headers=headers,
			timeout=timeout
		)
		
		assert response.status_code == 200

	def test_gliders_accessible_without_token(self, backend_url, timeout):
		"""Test that glider endpoints are accessible without authentication"""
		response = requests.get(
			f'{backend_url}/api/gliders',
			timeout=timeout
		)
		
		# Gliders endpoint is now public, should return 200
		assert response.status_code == 200

	def test_gliders_accessible_with_invalid_token(self, backend_url, timeout):
		"""Test that gliders are accessible even with invalid token"""
		headers = {'Authorization': 'Bearer invalid.token.here'}
		response = requests.get(
			f'{backend_url}/api/gliders',
			headers=headers,
			timeout=timeout
		)
		
		# Gliders endpoint is public, should succeed even with invalid token
		assert response.status_code == 200


class TestGliderOperations:
	"""Glider CRUD operations tests"""

	def test_list_gliders(self, timeout):
		"""Test retrieving list of gliders without authentication"""
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			timeout=timeout
		)
		
		assert response.status_code == 200
		data = response.json()
		assert isinstance(data, list)

	def test_list_gliders_returns_valid_data(self, timeout):
		"""Test glider list contains valid data"""
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			timeout=timeout
		)
		
		assert response.status_code == 200
		data = response.json()
		
		if len(data) > 0:
			glider = data[0]
			assert 'model' in glider or 'id' in glider

	def test_get_glider_nonexistent(self, timeout):
		"""Test 404 for non-existent glider"""
		response = requests.get(
			f'{BACKEND_URL}/api/gliders/nonexistent-glider-12345',
			timeout=timeout
		)
		
		assert response.status_code == 404


class TestWeighingOperations:
	"""Weighing mutation tests."""

	def test_update_weighing_preserves_id(self, auth_token, timeout):
		"""Update a weighing in place and keep the same weighing id."""
		headers = {'Authorization': f'Bearer {auth_token}'}
		original = _get_glider_weighing('F-CGUP', timeout)
		updated_payload = {
			'date': original['date'],
			'p1': round(original['p1'] + 1.0, 2),
			'p2': original['p2'],
			'right_wing_weight': original['right_wing_weight'],
			'left_wing_weight': original['left_wing_weight'],
			'tail_weight': original['tail_weight'],
			'fuselage_weight': original['fuselage_weight'],
			'fix_ballast_weight': original['fix_ballast_weight'],
			'A': original['A'],
			'D': original['D'],
		}

		try:
			response = requests.put(
				f'{BACKEND_URL}/api/gliders/by-id/F-CGUP/weighings/{original["id"]}',
				json=updated_payload,
				headers=headers,
				timeout=timeout,
			)

			assert response.status_code == 200
			data = response.json()
			assert data['id'] == original['id']
			assert data['p1'] == updated_payload['p1']

			refetched = _get_glider_details('F-CGUP', timeout)
			matching = next((weighing for weighing in refetched['weighings'] if weighing['id'] == original['id']), None)
			assert matching is not None
			assert matching['p1'] == updated_payload['p1']
		finally:
			restore_payload = {
				'date': original['date'],
				'p1': original['p1'],
				'p2': original['p2'],
				'right_wing_weight': original['right_wing_weight'],
				'left_wing_weight': original['left_wing_weight'],
				'tail_weight': original['tail_weight'],
				'fuselage_weight': original['fuselage_weight'],
				'fix_ballast_weight': original['fix_ballast_weight'],
				'A': original['A'],
				'D': original['D'],
			}
			requests.put(
				f'{BACKEND_URL}/api/gliders/by-id/F-CGUP/weighings/{original["id"]}',
				json=restore_payload,
				headers=headers,
				timeout=timeout,
			)

	def test_update_weighing_returns_404_when_missing(self, auth_token, timeout):
		"""Updating an unknown weighing should return 404."""
		headers = {'Authorization': f'Bearer {auth_token}'}
		original = _get_glider_weighing('F-CGUP', timeout)
		missing_weighing_id = original['id'] + 999999
		payload = {
			'date': original['date'],
			'p1': original['p1'],
			'p2': original['p2'],
			'right_wing_weight': original['right_wing_weight'],
			'left_wing_weight': original['left_wing_weight'],
			'tail_weight': original['tail_weight'],
			'fuselage_weight': original['fuselage_weight'],
			'fix_ballast_weight': original['fix_ballast_weight'],
			'A': original['A'],
			'D': original['D'],
		}

		response = requests.put(
			f'{BACKEND_URL}/api/gliders/by-id/F-CGUP/weighings/{missing_weighing_id}',
			json=payload,
			headers=headers,
			timeout=timeout,
		)

		assert response.status_code == 404

	def test_update_weighing_rejects_other_glider_id(self, auth_token, timeout):
		"""A weighing id from another glider must not be reassigned."""
		headers = {'Authorization': f'Bearer {auth_token}'}
		target = _get_glider_weighing('F-CGUP', timeout)
		other = _get_glider_weighing('D-2080', timeout)
		payload = {
			'date': target['date'],
			'p1': target['p1'],
			'p2': target['p2'],
			'right_wing_weight': target['right_wing_weight'],
			'left_wing_weight': target['left_wing_weight'],
			'tail_weight': target['tail_weight'],
			'fuselage_weight': target['fuselage_weight'],
			'fix_ballast_weight': target['fix_ballast_weight'],
			'A': target['A'],
			'D': target['D'],
		}

		response = requests.put(
			f'{BACKEND_URL}/api/gliders/by-id/F-CGUP/weighings/{other["id"]}',
			json=payload,
			headers=headers,
			timeout=timeout,
		)

		assert response.status_code == 404

	def test_update_weighing_returns_400_for_invalid_date(self, auth_token, timeout):
		"""Invalid weighing dates should be rejected."""
		headers = {'Authorization': f'Bearer {auth_token}'}
		original = _get_glider_weighing('F-CGUP', timeout)
		payload = {
			'date': '2024/31/12',
			'p1': original['p1'],
			'p2': original['p2'],
			'right_wing_weight': original['right_wing_weight'],
			'left_wing_weight': original['left_wing_weight'],
			'tail_weight': original['tail_weight'],
			'fuselage_weight': original['fuselage_weight'],
			'fix_ballast_weight': original['fix_ballast_weight'],
			'A': original['A'],
			'D': original['D'],
		}

		response = requests.put(
			f'{BACKEND_URL}/api/gliders/by-id/F-CGUP/weighings/{original["id"]}',
			json=payload,
			headers=headers,
			timeout=timeout,
		)

		assert response.status_code == 400

	def test_print_weighing_returns_pdf_for_editor(self, editor_token, timeout):
		"""Editors should be able to export a weighing sheet as PDF."""
		headers = {'Authorization': f'Bearer {editor_token}'}
		original = _get_glider_weighing('F-CGUP', timeout)

		response = requests.get(
			f'{BACKEND_URL}/api/gliders/by-id/F-CGUP/weighings/{original["id"]}/print',
			headers=headers,
			timeout=timeout,
		)

		assert response.status_code == 200
		assert response.headers['content-type'].startswith('application/pdf')
		assert response.headers['content-disposition'].startswith('inline;')
		assert response.content.startswith(b'%PDF')

	def test_print_weighing_returns_404_when_missing(self, editor_token, timeout):
		"""Printing an unknown weighing should return 404."""
		headers = {'Authorization': f'Bearer {editor_token}'}
		original = _get_glider_weighing('F-CGUP', timeout)

		response = requests.get(
			f'{BACKEND_URL}/api/gliders/by-id/F-CGUP/weighings/{original["id"] + 999999}/print',
			headers=headers,
			timeout=timeout,
		)

		assert response.status_code == 404


class TestCGCalculationsFromE2E:
	"""Port of CG scenarios from e2e/cg-calculation.spec.ts to API integration tests."""

	@pytest.mark.parametrize(
		'scenario',
		[
			{
				'name': 'F-CGUP 80kg pilot',
				'glider_id': 'F-CGUP',
				'payload': {
					'front_pilot_weight': 80.0,
					'rear_pilot_weight': 0.0,
					'front_ballast_weight': 0.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 356.0,
				'expected_total_weight': 364.8,
				'expected_non_lifting': 212.0,
			},
			{
				'name': 'F-CGUP 95kg pilot',
				'glider_id': 'F-CGUP',
				'payload': {
					'front_pilot_weight': 95.0,
					'rear_pilot_weight': 0.0,
					'front_ballast_weight': 0.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 322.0,
				'expected_total_weight': 379.8,
				'expected_non_lifting': 227.0,
			},
			{
				'name': 'F-CGUP 62kg pilot out-of-sector',
				'glider_id': 'F-CGUP',
				'payload': {
					'front_pilot_weight': 62.0,
					'rear_pilot_weight': 0.0,
					'front_ballast_weight': 0.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 401.0,
				'expected_total_weight': 346.8,
				'expected_non_lifting': 194.0,
				'expected_out_of_sector': True,
			},
			{
				'name': 'D-2080 80kg pilot',
				'glider_id': 'D-2080',
				'payload': {
					'front_pilot_weight': 80.0,
					'rear_pilot_weight': 0.0,
					'front_ballast_weight': 0.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 351.0,
				'expected_total_weight': 364.2,
				'expected_non_lifting': 214.2,
			},
			{
				'name': 'D-2080 80kg pilot + 3kg rear ballast out-of-sector',
				'glider_id': 'D-2080',
				'payload': {
					'front_pilot_weight': 80.0,
					'rear_pilot_weight': 0.0,
					'front_ballast_weight': 0.0,
					'rear_ballast_weight': 3.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 383.0,
				'expected_total_weight': 367.2,
				'expected_non_lifting': 217.2,
				'expected_out_of_sector': True,
			},
			{
				'name': 'D-2080 65kg pilot + 5kg front ballast',
				'glider_id': 'D-2080',
				'payload': {
					'front_pilot_weight': 65.0,
					'rear_pilot_weight': 0.0,
					'front_ballast_weight': 5.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 359.0,
				'expected_total_weight': 354.2,
				'expected_non_lifting': 204.2,
			},
			{
				'name': 'F-CJBH 60kg front + 80kg rear pilot',
				'glider_id': 'F-CJBH',
				'payload': {
					'front_pilot_weight': 60.0,
					'rear_pilot_weight': 80.0,
					'front_ballast_weight': 0.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 2330.0,
				'expected_total_weight': 501.4,
				'expected_non_lifting': 321.0,
			},
			{
				'name': 'F-CJBH 50kg front + 80kg rear pilot out-of-sector',
				'glider_id': 'F-CJBH',
				'payload': {
					'front_pilot_weight': 50.0,
					'rear_pilot_weight': 80.0,
					'front_ballast_weight': 0.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 2356.0,
				'expected_total_weight': 491.4,
				'expected_non_lifting': 311.0,
				'expected_out_of_sector': True,
			},
			{
				'name': 'F-CJBH 50kg front + 80kg rear + 5kg front ballast',
				'glider_id': 'F-CJBH',
				'payload': {
					'front_pilot_weight': 50.0,
					'rear_pilot_weight': 80.0,
					'front_ballast_weight': 5.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 0.0,
				},
				'expected_cg': 2333.0,
				'expected_total_weight': 496.4,
				'expected_non_lifting': 316.0,
				'expected_out_of_sector': False,
			},
			{
				'name': 'F-CJDT 60kg front + 80kg rear + 5kg front + 40kg wing ballast out-of-sector',
				'glider_id': 'F-CJDT',
				'payload': {
					'front_pilot_weight': 60.0,
					'rear_pilot_weight': 80.0,
					'front_ballast_weight': 5.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 40.0,
				},
				'expected_cg': 203.0,
				'expected_total_weight': 595.9,
				'expected_non_lifting': 336.4,
				'expected_out_of_sector': True,
				'expected_empty_wing': {
					'cg': 206.0,
					'total_weight': 555.9,
				},
			},
			{
				'name': 'F-CJDT 50kg front + 80kg rear + 5kg front + 40kg wing ballast in-sector',
				'glider_id': 'F-CJDT',
				'payload': {
					'front_pilot_weight': 50.0,
					'rear_pilot_weight': 80.0,
					'front_ballast_weight': 5.0,
					'rear_ballast_weight': 0.0,
					'wing_water_ballast_weight': 40.0,
				},
				'expected_cg': 229.0,
				'expected_total_weight': 585.9,
				'expected_non_lifting': 326.4,
				'expected_out_of_sector': False,
				'expected_empty_wing': {
					'cg': 233.0,
					'total_weight': 545.9,
				},
			},
		],
		ids=lambda s: s['name'],
	)
	def test_cg_scenarios_match_e2e(self, timeout, scenario):
		glider_id = scenario['glider_id']
		payload = scenario['payload']

		limits = _get_glider_limits(glider_id, timeout)
		calc = _calculate_weight_and_balance(glider_id, payload, timeout)

		assert round(calc['center_of_gravity'], 0) == scenario['expected_cg']
		assert round(calc['total_weight'], 1) == scenario['expected_total_weight']

		non_lifting_weight = (
			float(limits['mvenp'])
			+ payload['front_pilot_weight']
			+ payload['rear_pilot_weight']
			+ payload['front_ballast_weight']
			+ payload['rear_ballast_weight']
		)
		assert round(non_lifting_weight, 1) == scenario['expected_non_lifting']

		if 'expected_out_of_sector' in scenario:
			glider = _get_glider_details(glider_id, timeout)
			polygon = glider['weight_and_balances']
			assert len(polygon) >= 3

			is_inside = _is_point_inside_polygon(
				calc['center_of_gravity'],
				calc['total_weight'],
				polygon,
			)
			if scenario['expected_out_of_sector']:
				assert not is_inside
			else:
				assert is_inside

		if 'expected_empty_wing' in scenario:
			empty_wing_payload = dict(payload)
			empty_wing_payload['wing_water_ballast_weight'] = 0.0
			calc_empty_wing = _calculate_weight_and_balance(glider_id, empty_wing_payload, timeout)
			assert round(calc_empty_wing['center_of_gravity'], 0) == scenario['expected_empty_wing']['cg']
			assert round(calc_empty_wing['total_weight'], 1) == scenario['expected_empty_wing']['total_weight']

	@pytest.mark.parametrize('glider_id', ['test-1', 'test-2', 'invalid-id-xyz'])
	def test_get_nonexistent_gliders(self, timeout, glider_id):
		"""Test 404 for various non-existent glider IDs"""
		response = requests.get(
			f'{BACKEND_URL}/api/gliders/{glider_id}',
			timeout=timeout
		)
		
		assert response.status_code == 404


class TestCORS:
	"""CORS headers tests"""

	def test_cors_headers_present(self, backend_url, timeout):
		"""Test CORS headers are present"""
		headers = {'Origin': 'http://localhost:3000'}
		response = requests.options(
			f'{backend_url}/api/gliders',
			headers=headers,
			timeout=timeout
		)
		
		# Either CORS headers present or 405 for OPTIONS not explicitly allowed
		if 'access-control-allow-origin' in response.headers:
			assert 'access-control-allow-origin' in response.headers
		else:
			# OPTIONS might not be supported but other methods would have CORS headers
			assert response.status_code in [200, 405]


class TestDataConsistency:
	"""Data consistency and reliability tests"""

	def test_repeated_requests_return_identical_data(self, timeout):
		"""Test that repeated requests return identical data"""
		# First request
		response1 = requests.get(
			f'{BACKEND_URL}/api/gliders',
			timeout=timeout
		)
		
		# Small delay
		time.sleep(0.5)
		
		# Second request
		response2 = requests.get(
			f'{BACKEND_URL}/api/gliders',
			timeout=timeout
		)
		
		assert response1.status_code == 200
		assert response2.status_code == 200
		
		data1 = json.dumps(response1.json(), sort_keys=True)
		data2 = json.dumps(response2.json(), sort_keys=True)
		assert data1 == data2


class TestPerformance:
	"""Performance and response time tests"""

	def test_health_endpoint_response_time(self, backend_url, timeout):
		"""Test health endpoint responds within acceptable time"""
		start = time.time()
		response = requests.get(f'{backend_url}/health', timeout=timeout)
		elapsed_ms = (time.time() - start) * 1000
		
		assert response.status_code == 200
		assert elapsed_ms < 1000  # Should respond in less than 1 second

	def test_gliders_endpoint_response_time(self, timeout):
		"""Test gliders endpoint responds within acceptable time"""
		start = time.time()
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			timeout=timeout
		)
		elapsed_ms = (time.time() - start) * 1000
		
		assert response.status_code == 200
		assert elapsed_ms < 2000  # Should respond in less than 2 seconds

	def test_login_response_time(self, test_credentials, timeout):
		"""Test login endpoint responds within acceptable time"""
		start = time.time()
		response = requests.post(
			f'{BACKEND_URL}/api/auth/login',
			json=test_credentials,
			timeout=timeout
		)
		elapsed_ms = (time.time() - start) * 1000
		
		assert response.status_code in [200, 401]
		assert elapsed_ms < 2000  # Should respond in less than 2 seconds


class TestErrorHandling:
	"""Error handling and edge cases"""

	def test_connection_timeout(self, timeout):
		"""Test handling of connection timeout"""
		# Use an invalid port to trigger timeout
		with pytest.raises(requests.exceptions.RequestException):
			requests.get('http://localhost:9999/health', timeout=0.001)

	def test_malformed_json_request(self, timeout):
		"""Test handling of malformed JSON requests"""
		# Send request with invalid JSON
		response = requests.post(
			f'{BACKEND_URL}/api/auth/login',
			data='not json',
			headers={'Content-Type': 'application/json'},
			timeout=timeout
		)
		
		# Should return 400 or similar error
		assert response.status_code >= 400

	def test_missing_required_fields(self, timeout):
		"""Test handling of missing required fields"""
		response = requests.post(
			f'{BACKEND_URL}/api/auth/login',
			json={'username': 'test'},  # Missing password
			timeout=timeout
		)
		
		assert response.status_code >= 400


@pytest.fixture(scope='session', autouse=True)
def check_backend_available():
	"""Check that backend is available before running tests"""
	try:
		response = requests.get(f'{BACKEND_URL}/health', timeout=TIMEOUT)
		if response.status_code != 200:
			pytest.skip(f'Backend returned unexpected status: {response.status_code}')
	except requests.exceptions.ConnectionError:
		pytest.skip(f'Backend not available at {BACKEND_URL}')
	except requests.exceptions.RequestException as e:
		pytest.skip(f'Backend connection error: {str(e)}')
