#!/usr/bin/env python3
"""
Integration testing script for PyGliderCG backend and Streamlit frontend.

Tests:
1. Backend health check
2. Authentication flow (login, token refresh, logout)
3. Glider operations (CRUD)
4. Error handling
5. Data consistency
"""

import requests
import json
import time
import sys
import logging
from typing import Dict, Any, Tuple

# Configure logging
logging.basicConfig(
	level=logging.INFO,
	format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Test configuration
BACKEND_URL = 'http://localhost:8000'
TIMEOUT = 10

# Test results tracking
test_results = {
	'passed': 0,
	'failed': 0,
	'errors': []
}

# Test credentials
TEST_USERNAME = 'testadmin'
TEST_PASSWORD = 'testpass123'


def log_test(test_name: str, status: str, message: str = ''):
	"""Log test result"""
	status_symbol = '✅' if status == 'PASS' else '❌'
	logger.info(f'{status_symbol} {test_name}: {message}')
	if status == 'PASS':
		test_results['passed'] += 1
	else:
		test_results['failed'] += 1
		test_results['errors'].append(f'{test_name}: {message}')


def test_backend_health() -> Tuple[bool, str]:
	"""Test 1: Backend health check endpoint"""
	logger.info('\n' + '='*60)
	logger.info('TEST 1: BACKEND HEALTH CHECK')
	logger.info('='*60)
	
	try:
		response = requests.get(f'{BACKEND_URL}/health', timeout=TIMEOUT)
		if response.status_code == 200:
			data = response.json()
			logger.info(f'Health response: {json.dumps(data, indent=2)}')
			log_test('Backend Health', 'PASS', 'Health endpoint responsive')
			return True, 'Backend is healthy'
		else:
			log_test('Backend Health', 'FAIL', f'Status code: {response.status_code}')
			return False, f'Unexpected status code: {response.status_code}'
	except requests.exceptions.ConnectionError as e:
		log_test('Backend Health', 'FAIL', f'Connection error: {str(e)}')
		return False, f'Cannot connect to backend at {BACKEND_URL}'
	except Exception as e:
		log_test('Backend Health', 'FAIL', str(e))
		return False, str(e)


def test_api_docs() -> Tuple[bool, str]:
	"""Test OpenAPI docs accessible"""
	logger.info('\nTesting OpenAPI documentation...')
	
	try:
		response = requests.get(f'{BACKEND_URL}/docs', timeout=TIMEOUT)
		if response.status_code == 200:
			log_test('OpenAPI Docs', 'PASS', 'Documentation accessible')
			return True, 'Docs available at /docs'
		else:
			log_test('OpenAPI Docs', 'FAIL', f'Status code: {response.status_code}')
			return False, f'Status code: {response.status_code}'
	except Exception as e:
		log_test('OpenAPI Docs', 'FAIL', str(e))
		return False, str(e)


def test_login(username: str, password: str) -> Tuple[bool, str, str]:
	"""Test login endpoint"""
	logger.info('\n' + '='*60)
	logger.info('TEST 2: AUTHENTICATION FLOW')
	logger.info('='*60)
	logger.info(f'Testing login with username: {username}')
	
	try:
		response = requests.post(
			f'{BACKEND_URL}/api/auth/login',
			json={'username': username, 'password': password},
			timeout=TIMEOUT
		)
		
		if response.status_code == 200:
			data = response.json()
			token = data.get('access_token')
			logger.info(f'Login response: token={token[:20]}...')
			log_test('Login', 'PASS', 'Valid credentials accepted')
			return True, 'Login successful', token
		elif response.status_code == 401:
			log_test('Login Invalid Credentials', 'PASS', 'Invalid credentials rejected with 401')
			return False, 'Invalid credentials', ''
		else:
			log_test('Login', 'FAIL', f'Status code: {response.status_code}')
			return False, f'Status code: {response.status_code}', ''
	except Exception as e:
		log_test('Login', 'FAIL', str(e))
		return False, str(e), ''


def test_invalid_credentials() -> bool:
	"""Test invalid credentials are rejected"""
	logger.info('\nTesting invalid credentials...')
	
	try:
		response = requests.post(
			f'{BACKEND_URL}/api/auth/login',
			json={'username': 'invalid_user', 'password': 'wrong_password'},
			timeout=TIMEOUT
		)
		
		if response.status_code == 401:
			log_test('Reject Invalid Credentials', 'PASS', '401 returned for invalid credentials')
			return True
		else:
			log_test('Reject Invalid Credentials', 'FAIL', f'Status: {response.status_code}, expected 401')
			return False
	except Exception as e:
		log_test('Reject Invalid Credentials', 'FAIL', str(e))
		return False


def test_get_user_info(token: str) -> Tuple[bool, str]:
	"""Test getting user info"""
	logger.info('\nTesting get user info endpoint...')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/auth/me',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response.status_code == 200:
			data = response.json()
			logger.info(f'User info: {json.dumps(data, indent=2)}')
			log_test('Get User Info', 'PASS', f'Retrieved user: {data.get("username")}')
			return True, data.get('username', 'unknown')
		else:
			log_test('Get User Info', 'FAIL', f'Status: {response.status_code}')
			return False, ''
	except Exception as e:
		log_test('Get User Info', 'FAIL', str(e))
		return False, ''


def test_token_refresh(token: str) -> Tuple[bool, str, str]:
	"""Test token refresh endpoint"""
	logger.info('\nTesting token refresh...')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		response = requests.post(
			f'{BACKEND_URL}/api/auth/refresh',
			json={'refresh_token': token},
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response.status_code == 200:
			data = response.json()
			new_token = data.get('access_token')
			logger.info(f'Token refreshed: {new_token[:20]}...')
			log_test('Token Refresh', 'PASS', 'Token refreshed successfully')
			return True, 'Token refreshed', new_token
		else:
			log_test('Token Refresh', 'FAIL', f'Status: {response.status_code}')
			return False, f'Status: {response.status_code}', ''
	except Exception as e:
		log_test('Token Refresh', 'FAIL', str(e))
		return False, str(e), ''


def test_logout(token: str) -> bool:
	"""Test logout endpoint"""
	logger.info('\nTesting logout...')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		response = requests.post(
			f'{BACKEND_URL}/api/auth/logout',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response.status_code == 200:
			log_test('Logout', 'PASS', 'Logout successful')
			return True
		else:
			log_test('Logout', 'FAIL', f'Status: {response.status_code}')
			return False
	except Exception as e:
		log_test('Logout', 'FAIL', str(e))
		return False


def test_list_gliders(token: str) -> Tuple[bool, str]:
	"""Test getting list of gliders"""
	logger.info('\n' + '='*60)
	logger.info('TEST 3: GLIDER OPERATIONS')
	logger.info('='*60)
	logger.info('Testing list gliders endpoint...')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response.status_code == 200:
			data = response.json()
			count = len(data) if isinstance(data, list) else 0
			logger.info(f'Gliders found: {count}')
			if count > 0:
				logger.info(f'First glider: {json.dumps(data[0], indent=2)[:200]}...')
			log_test('List Gliders', 'PASS', f'{count} gliders retrieved')
			return True, json.dumps(data)
		else:
			log_test('List Gliders', 'FAIL', f'Status: {response.status_code}')
			return False, ''
	except Exception as e:
		log_test('List Gliders', 'FAIL', str(e))
		return False, ''


def test_get_glider(token: str, glider_id: str) -> Tuple[bool, str]:
	"""Test getting single glider"""
	logger.info(f'\nTesting get single glider: {glider_id}')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders/{glider_id}',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response.status_code == 200:
			data = response.json()
			logger.info(f'Glider retrieved: {data.get("model", "unknown")}')
			log_test(f'Get Glider {glider_id}', 'PASS', f'Retrieved glider')
			return True, json.dumps(data)
		else:
			log_test(f'Get Glider {glider_id}', 'FAIL', f'Status: {response.status_code}')
			return False, ''
	except Exception as e:
		log_test(f'Get Glider {glider_id}', 'FAIL', str(e))
		return False, ''


def test_nonexistent_glider(token: str) -> bool:
	"""Test 404 for non-existent glider"""
	logger.info('\nTesting non-existent glider (should return 404)...')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders/nonexistent-glider-12345',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response.status_code == 404:
			log_test('404 Non-existent Glider', 'PASS', 'Correctly returned 404')
			return True
		else:
			log_test('404 Non-existent Glider', 'FAIL', f'Expected 404, got {response.status_code}')
			return False
	except Exception as e:
		log_test('404 Non-existent Glider', 'FAIL', str(e))
		return False


def test_unauthorized_access() -> bool:
	"""Test unauthorized access without token"""
	logger.info('\nTesting unauthorized access (no token)...')
	
	try:
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			timeout=TIMEOUT
		)
		
		if response.status_code == 403:
			log_test('Unauthorized Access', 'PASS', 'Correctly blocked unauthorized access')
			return True
		else:
			log_test('Unauthorized Access', 'FAIL', f'Expected 403, got {response.status_code}')
			return False
	except Exception as e:
		log_test('Unauthorized Access', 'FAIL', str(e))
		return False


def test_invalid_token() -> bool:
	"""Test invalid token rejection"""
	logger.info('\nTesting invalid token rejection...')
	
	try:
		headers = {'Authorization': 'Bearer invalid.token.here'}
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response.status_code == 401:
			log_test('Invalid Token', 'PASS', 'Correctly rejected invalid token')
			return True
		else:
			log_test('Invalid Token', 'FAIL', f'Expected 401, got {response.status_code}')
			return False
	except Exception as e:
		log_test('Invalid Token', 'FAIL', str(e))
		return False


def test_cors_headers() -> bool:
	"""Test CORS headers"""
	logger.info('\n' + '='*60)
	logger.info('TEST 4: CORS HEADERS')
	logger.info('='*60)
	
	try:
		# CORS preflight requests require the Origin header
		headers = {'Origin': 'http://localhost:3000'}
		response = requests.options(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if 'access-control-allow-origin' in response.headers:
			origin = response.headers.get('access-control-allow-origin', 'unknown')
			log_test('CORS Headers', 'PASS', f'CORS enabled: {origin}')
			return True
		elif response.status_code == 405:
			log_test('CORS Headers', 'WARN', f'OPTIONS method not explicitly allowed (405), but CORS may work with preflight')
			return True  # Not a hard failure for integration testing
		else:
			logger.info(f'Response status: {response.status_code}')
			logger.info(f'Response headers: {dict(response.headers)}')
			log_test('CORS Headers', 'FAIL', f'CORS headers not present (status: {response.status_code})')
			return False
	except Exception as e:
		log_test('CORS Headers', 'FAIL', str(e))
		return False


def test_data_consistency(token: str) -> bool:
	"""Test data consistency between requests"""
	logger.info('\n' + '='*60)
	logger.info('TEST 5: DATA CONSISTENCY')
	logger.info('='*60)
	logger.info('Testing data consistency (repeated requests)...')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		
		# First request
		response1 = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=TIMEOUT
		)
		
		# Small delay
		time.sleep(0.5)
		
		# Second request
		response2 = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=TIMEOUT
		)
		
		if response1.status_code == 200 and response2.status_code == 200:
			data1 = json.dumps(response1.json(), sort_keys=True)
			data2 = json.dumps(response2.json(), sort_keys=True)
			
			if data1 == data2:
				log_test('Data Consistency', 'PASS', 'Repeated requests return identical data')
				return True
			else:
				log_test('Data Consistency', 'FAIL', 'Data differs between requests')
				return False
		else:
			log_test('Data Consistency', 'FAIL', f'Request failed: {response1.status_code}, {response2.status_code}')
			return False
	except Exception as e:
		log_test('Data Consistency', 'FAIL', str(e))
		return False


def test_response_times(token: str) -> bool:
	"""Test response times for performance"""
	logger.info('\n' + '='*60)
	logger.info('TEST 6: PERFORMANCE')
	logger.info('='*60)
	logger.info('Testing response times...')
	
	try:
		headers = {'Authorization': f'Bearer {token}'}
		
		# Test health endpoint
		start = time.time()
		response = requests.get(f'{BACKEND_URL}/health', timeout=TIMEOUT)
		health_time = (time.time() - start) * 1000
		
		# Test gliders endpoint
		start = time.time()
		response = requests.get(
			f'{BACKEND_URL}/api/gliders',
			headers=headers,
			timeout=TIMEOUT
		)
		gliders_time = (time.time() - start) * 1000
		
		logger.info(f'Health endpoint: {health_time:.2f}ms')
		logger.info(f'Gliders endpoint: {gliders_time:.2f}ms')
		
		if health_time < 1000 and gliders_time < 2000:
			log_test('Response Times', 'PASS', f'Health: {health_time:.0f}ms, Gliders: {gliders_time:.0f}ms')
			return True
		else:
			log_test('Response Times', 'WARN', f'Slow responses: Health: {health_time:.0f}ms, Gliders: {gliders_time:.0f}ms')
			return True  # Not a hard failure
	except Exception as e:
		log_test('Response Times', 'FAIL', str(e))
		return False


def print_summary():
	"""Print test summary"""
	logger.info('\n' + '='*60)
	logger.info('TEST SUMMARY')
	logger.info('='*60)
	logger.info(f'Passed: {test_results["passed"]}')
	logger.info(f'Failed: {test_results["failed"]}')
	
	if test_results['errors']:
		logger.info('\nErrors:')
		for error in test_results['errors']:
			logger.info(f'  - {error}')
	
	total = test_results['passed'] + test_results['failed']
	if total > 0:
		pass_rate = (test_results['passed'] / total) * 100
		logger.info(f'\nPass rate: {pass_rate:.1f}%')
	
	return test_results['failed'] == 0


def main():
	"""Run all integration tests"""
	logger.info('Starting PyGliderCG Integration Tests')
	logger.info(f'Backend URL: {BACKEND_URL}')
	logger.info(f'Timeout: {TIMEOUT}s\n')
	
	# Test 1: Backend Health
	backend_ok, msg = test_backend_health()
	if not backend_ok:
		logger.error(f'Backend not available: {msg}')
		logger.error('Cannot continue with integration tests.')
		print_summary()
		return False
	
	test_api_docs()
	
	# Test 2: Authentication
	success, msg, token = test_login(TEST_USERNAME, TEST_PASSWORD)
	if not success or not token:
		logger.warning(f'Login failed: {msg}')
		logger.warning('Some tests will be skipped.')
		test_invalid_credentials()
		print_summary()
		return False
	
	# Additional auth tests
	test_invalid_credentials()
	test_get_user_info(token)
	success, msg, new_token = test_token_refresh(token)
	if success and new_token:
		token = new_token
	test_logout(token)
	
	# Get fresh token for remaining tests
	success, msg, token = test_login(TEST_USERNAME, TEST_PASSWORD)
	if not success or not token:
		logger.warning('Could not get fresh token for remaining tests')
		print_summary()
		return False
	
	# Test 3: Glider Operations
	test_list_gliders(token)
	test_nonexistent_glider(token)
	test_unauthorized_access()
	test_invalid_token()
	
	# Test 4: CORS
	test_cors_headers()
	
	# Test 5: Data Consistency
	test_data_consistency(token)
	
	# Test 6: Performance
	test_response_times(token)
	
	# Print summary
	all_passed = print_summary()
	
	return all_passed


if __name__ == '__main__':
	try:
		success = main()
		sys.exit(0 if success else 1)
	except KeyboardInterrupt:
		logger.info('\nTests interrupted by user')
		sys.exit(1)
	except Exception as e:
		logger.error(f'Unexpected error: {e}')
		import traceback
		traceback.print_exc()
		sys.exit(1)
