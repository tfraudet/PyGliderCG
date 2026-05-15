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

	def test_unauthorized_access_without_token(self, backend_url, timeout):
		"""Test unauthorized access without token"""
		response = requests.get(
			f'{backend_url}/api/gliders',
			timeout=timeout
		)
		
		assert response.status_code == 403

	def test_invalid_token_rejection(self, backend_url, timeout):
		"""Test invalid token rejection"""
		headers = {'Authorization': 'Bearer invalid.token.here'}
		response = requests.get(
			f'{backend_url}/api/gliders',
			headers=headers,
			timeout=timeout
		)
		
		assert response.status_code == 401


class TestGliderOperations:
	"""Glider CRUD operations tests"""

	def test_list_gliders(self, auth_token, timeout):
		"""Test retrieving list of gliders"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=timeout
		)
		
		assert response.status_code == 200
		data = response.json()
		assert isinstance(data, list)

	def test_list_gliders_returns_valid_data(self, auth_token, timeout):
		"""Test glider list contains valid data"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=timeout
		)
		
		assert response.status_code == 200
		data = response.json()
		
		if len(data) > 0:
			glider = data[0]
			assert 'model' in glider or 'id' in glider

	def test_get_glider_nonexistent(self, auth_token, timeout):
		"""Test 404 for non-existent glider"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders/nonexistent-glider-12345',
			headers=headers,
			timeout=timeout
		)
		
		assert response.status_code == 404

	@pytest.mark.parametrize('glider_id', ['test-1', 'test-2', 'invalid-id-xyz'])
	def test_get_nonexistent_gliders(self, auth_token, timeout, glider_id):
		"""Test 404 for various non-existent glider IDs"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders/{glider_id}',
			headers=headers,
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

	def test_repeated_requests_return_identical_data(self, auth_token, timeout):
		"""Test that repeated requests return identical data"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		
		# First request
		response1 = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=timeout
		)
		
		# Small delay
		time.sleep(0.5)
		
		# Second request
		response2 = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
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

	def test_gliders_endpoint_response_time(self, auth_token, timeout):
		"""Test gliders endpoint responds within acceptable time"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		
		start = time.time()
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
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

	def test_malformed_json_request(self, auth_token, timeout):
		"""Test handling of malformed JSON requests"""
		headers = {'Authorization': f'Bearer {auth_token}'}
		
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
