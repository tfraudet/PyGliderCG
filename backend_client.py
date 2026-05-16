"""HTTP client wrapper for Streamlit to communicate with FastAPI backend"""

import logging
import os
from typing import List, Optional, Dict, Any, Tuple, Union
from datetime import datetime

import requests
from requests.exceptions import RequestException, Timeout, ConnectionError
import streamlit as st

logger = logging.getLogger(__name__)


class BackendException(Exception):
	"""Base exception for backend client errors"""
	pass


class AuthenticationError(BackendException):
	"""Raised when authentication fails"""
	pass


class NotFoundError(BackendException):
	"""Raised when resource is not found"""
	pass


class ForbiddenError(BackendException):
	"""Raised when user lacks permission"""
	pass


class BackendClient:
	"""HTTP client for communicating with FastAPI backend"""

	def __init__(self, backend_url: Optional[str] = None, timeout: int = 10, max_retries: int = 3):
		"""
		Initialize the backend client.

		Args:
			backend_url: Backend API URL (defaults to env BACKEND_URL or http://localhost:8000)
			timeout: Request timeout in seconds (default: 10)
			max_retries: Number of retries for GET requests (default: 3)
		"""
		self.backend_url = backend_url or os.getenv('BACKEND_URL', 'http://localhost:8000')
		self.timeout = timeout
		self.max_retries = max_retries
		self._session = None

	@property
	def session(self) -> requests.Session:
		"""Get or create a requests session"""
		if self._session is None:
			self._session = requests.Session()
		return self._session

	def _get_headers(self) -> Dict[str, str]:
		"""Get request headers with JWT token if available"""
		headers = {'Content-Type': 'application/json'}

		if 'auth_token' in st.session_state and st.session_state['auth_token']:
			token = st.session_state['auth_token']
			headers['Authorization'] = f'Bearer {token}'

		return headers

	def _log_request(self, method: str, endpoint: str, status_code: Optional[int] = None):
		"""Log API request"""
		if st.session_state.get('debug_mode', False):
			user = st.session_state.get('current_user', {}).get('username', 'unknown')
			msg = f'{method} {endpoint} - user: {user}'
			if status_code:
				msg += f' - status: {status_code}'
			logger.debug(msg)

	def _make_request(
		self,
		method: str,
		endpoint: str,
		data: Optional[Union[Dict[str, Any], List[Any]]] = None,
		params: Optional[Dict[str, Any]] = None,
		retry: bool = True,
	) -> Tuple[int, Any]:
		"""
		Make HTTP request to backend.

		Args:
			method: HTTP method (GET, POST, PUT, DELETE)
			endpoint: API endpoint (without base URL)
			data: Request body
			params: Query parameters
			retry: Whether to retry on transient failures

		Returns:
			Tuple of (status_code, response_data)

		Raises:
			BackendException: Various subclasses for different error types
		"""
		url = f'{self.backend_url}{endpoint}'
		headers = self._get_headers()

		attempt = 0
		last_exception = None

		while attempt < (self.max_retries if method == 'GET' and retry else 1):
			try:
				self._log_request(method, endpoint)

				response = self.session.request(
					method=method,
					url=url,
					json=data,
					params=params,
					headers=headers,
					timeout=self.timeout,
				)

				self._log_request(method, endpoint, response.status_code)

				if response.status_code == 401:
					st.session_state.pop('auth_token', None)
					st.session_state.pop('current_user', None)
					raise AuthenticationError('Unauthorized - please log in again')

				if response.status_code == 403:
					raise ForbiddenError('You do not have permission for this action')

				if response.status_code == 404:
					raise NotFoundError('Resource not found')

				if response.status_code >= 500:
					raise BackendException(f'Server error: {response.status_code}')

				try:
					response_data = response.json() if response.text else {}
				except ValueError:
					response_data = response.text

				return response.status_code, response_data

			except (ConnectionError, Timeout) as e:
				last_exception = e
				attempt += 1
				if attempt < (self.max_retries if method == 'GET' and retry else 1):
					logger.debug(f'Request failed, retrying ({attempt}/{self.max_retries}): {e}')
					continue
				break

			except (AuthenticationError, ForbiddenError, NotFoundError, BackendException):
				raise

			except RequestException as e:
				logger.error(f'Request error: {e}')
				raise BackendException(f'Request failed: {str(e)}')

		if last_exception:
			logger.error(f'Request failed after {self.max_retries} attempts: {last_exception}')
			raise BackendException(f'Backend connection failed: {str(last_exception)}')

		raise BackendException('Request failed')

	# ===== Authentication Methods =====

	def login(self, username: str, password: str) -> Optional[Dict[str, Any]]:
		"""
		Authenticate user and store JWT token.

		Args:
			username: Username
			password: Password

		Returns:
			User info dict or None if login failed
		"""
		try:
			status_code, response = self._make_request(
				'POST',
				'/api/auth/login',
				data={'username': username, 'password': password},
				retry=False,
			)

			if status_code == 200:
				st.session_state['auth_token'] = response['access_token']
				user = self.get_current_user()
				if user:
					st.session_state['current_user'] = user
					logger.info(f'User {username} logged in successfully')
					return user
				else:
					st.session_state.pop('auth_token', None)
					return None

			return None

		except AuthenticationError:
			logger.warning(f'Login failed for user {username}')
			return None
		except BackendException as e:
			logger.error(f'Login error: {e}')
			st.error(f'Login failed: {str(e)}')
			return None

	def logout(self) -> None:
		"""Clear authentication token and user info"""
		try:
			if 'auth_token' in st.session_state:
				self._make_request('POST', '/api/auth/logout', retry=False)
		except BackendException:
			pass
		finally:
			st.session_state.pop('auth_token', None)
			st.session_state.pop('current_user', None)
			logger.info('User logged out')

	@staticmethod
	def _get_current_user_cached() -> Optional[Dict[str, Any]]:
		"""Cached version of get_current_user"""
		if 'auth_token' not in st.session_state or not st.session_state['auth_token']:
			return None

		try:
			client = BackendClient()
			status_code, response = client._make_request('GET', '/api/auth/me')

			if status_code == 200:
				return response
			return None
		except BackendException:
			return None

	def get_current_user(self) -> Optional[Dict[str, Any]]:
		"""
		Get current authenticated user info.

		Returns cached version when possible.

		Returns:
			User info dict or None if not authenticated
		"""
		if 'auth_token' not in st.session_state or not st.session_state['auth_token']:
			return None

		try:
			status_code, response = self._make_request('GET', '/api/auth/me')
			if status_code == 200:
				return response
			return None
		except BackendException:
			return None

	def is_authenticated(self) -> bool:
		"""Check if user is authenticated"""
		return 'auth_token' in st.session_state and bool(st.session_state.get('auth_token'))

	# ===== User Methods =====

	def get_users(self) -> List[Dict[str, Any]]:
		"""Get all users (admin only)."""
		if not self.is_authenticated():
			return []
		try:
			status_code, response = self._make_request('GET', '/api/users')
			if status_code == 200:
				return response
			return []
		except ForbiddenError:
			st.error('You do not have permission to view users')
			return []
		except BackendException as e:
			logger.error(f'Error fetching users: {e}')
			return []

	def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
		"""Create a new user (admin only)."""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return None
		try:
			status_code, response = self._make_request(
				'POST',
				'/api/users',
				data=user_data,
				retry=False,
			)
			if status_code in (200, 201):
				self.clear_caches()
				return response
			if status_code == 422:
				error_detail = response.get('detail')[0]['msg']
				logger.error(f'Validation failed for user {user_data['username']}: {error_detail}')
				st.error(f'Validation failed: {error_detail}')
			return None
		except ForbiddenError:
			st.error('You do not have permission to create users')
			return None
		except BackendException as e:
			st.error(f'Failed to create user: {str(e)}')
			logger.error(f'Error creating user: {e}')
			return None

	def update_user(self, username: str, user_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
		"""Update an existing user (admin only)."""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return None
		try:
			status_code, response = self._make_request(
				'PUT',
				f'/api/users/{username}',
				data=user_data,
				retry=False,
			)
			if status_code == 200:
				self.clear_caches()
				return response
			if status_code == 422:
				error_detail = response.get('detail')[0]['msg']
				logger.error(f'Validation failed for user {user_data['username']}: {error_detail}')
				st.error(f'Validation failed: {error_detail}')
			return None
		except NotFoundError:
			st.error(f'User {username} not found')
			return None
		except ForbiddenError:
			st.error('You do not have permission to update users')
			return None
		except BackendException as e:
			st.error(f'Failed to update user: {str(e)}')
			logger.error(f'Error updating user {username}: {e}')
			return None

	def delete_user(self, username: str) -> bool:
		"""Delete a user (admin only)."""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return False
		try:
			status_code, response = self._make_request(
				'DELETE',
				f'/api/users/{username}',
				retry=False,
			)
			if status_code == 204:
				self.clear_caches()
				return True
			return False
		except NotFoundError:
			st.error(f'User {username} not found')
			return False
		except ForbiddenError:
			st.error('You do not have permission to delete users')
			return False
		except BackendException as e:
			st.error(f'Failed to delete user: {str(e)}')
			logger.error(f'Error deleting user {username}: {e}')
			return False

	# ===== Glider Methods =====

	@staticmethod
	def _get_gliders_cached() -> Optional[List[Dict[str, Any]]]:
		"""Cached version of get_gliders"""
		try:
			client = BackendClient()

			status_code, response = client._make_request('GET', '/api/gliders')
			if status_code == 200:
				return response
			return None
		except BackendException:
			logger.warning('Failed to fetch gliders, using fallback')
			return []

	def get_gliders(self, skip: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
		"""
		Get all gliders with caching (TTL: 3600 seconds).

		Args:
			skip: Number of gliders to skip
			limit: Maximum number of gliders to return

		Returns:
			List of glider dicts
		"""
		try:
			status_code, response = self._make_request(
				'GET',
				'/api/gliders',
				params={'skip': skip, 'limit': limit},
			)

			if status_code == 200:
				return response
			return []

		except BackendException as e:
			logger.error(f'Error fetching gliders: {e}')
			return []

	@staticmethod
	def _get_glider_cached(glider_id: str) -> Optional[Dict[str, Any]]:
		"""Cached version of get_glider"""
		try:
			client = BackendClient()

			status_code, response = client._make_request('GET', f'/api/gliders/{glider_id}')
			if status_code == 200:
				return response
			return None
		except BackendException:
			return None

	def get_glider(self, glider_id: str) -> Optional[Dict[str, Any]]:
		"""
		Get a single glider by ID with caching (TTL: 3600 seconds).

		Args:
			glider_id: Glider registration number

		Returns:
			Glider dict or None if not found
		"""
		try:
			status_code, response = self._make_request('GET', f'/api/gliders/{glider_id}')

			if status_code == 200:
				return response
			elif status_code == 404:
				return None
			return None

		except NotFoundError:
			return None
		except BackendException as e:
			logger.error(f'Error fetching glider {glider_id}: {e}')
			return None

	def create_glider(self, glider_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
		"""
		Create a new glider.

		Args:
			glider_data: Glider data dict

		Returns:
			Created glider dict or None on failure
		"""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return None

		try:
			status_code, response = self._make_request(
				'POST',
				'/api/gliders',
				data=glider_data,
				retry=False,
			)

			if status_code in (200, 201):
				self.clear_caches()
				logger.info(f'Glider {glider_data.get("registration")} created successfully')
				return response

			if status_code == 400:
				st.error(f'Invalid glider data: {response.get("detail", "Unknown error")}')
			elif status_code == 403:
				st.error('You do not have permission to create gliders')

			return None

		except ForbiddenError:
			st.error('You do not have permission to create gliders')
			return None
		except BackendException as e:
			st.error(f'Failed to create glider: {str(e)}')
			logger.error(f'Error creating glider: {e}')
			return None

	def update_glider(self, glider_id: str, glider_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
		"""
		Update an existing glider.

		Args:
			glider_id: Glider registration number
			glider_data: Updated glider data dict

		Returns:
			Updated glider dict or None on failure
		"""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return None

		try:
			status_code, response = self._make_request(
				'PUT',
				f'/api/gliders/{glider_id}',
				data=glider_data,
				retry=False,
			)

			if status_code == 200:
				self.clear_caches()
				logger.info(f'Glider {glider_id} updated successfully')
				return response

			if status_code == 404:
				st.error(f'Glider {glider_id} not found')
			elif status_code == 403:
				st.error('You do not have permission to update gliders')

			return None

		except NotFoundError:
			st.error(f'Glider {glider_id} not found')
			return None
		except ForbiddenError:
			st.error('You do not have permission to update gliders')
			return None
		except BackendException as e:
			st.error(f'Failed to update glider: {str(e)}')
			logger.error(f'Error updating glider: {e}')
			return None

	def delete_glider(self, glider_id: str) -> bool:
		"""
		Delete a glider.

		Args:
			glider_id: Glider registration number

		Returns:
			True if deleted successfully, False otherwise
		"""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return False

		try:
			status_code, response = self._make_request(
				'DELETE',
				f'/api/gliders/{glider_id}',
				retry=False,
			)

			if status_code == 204:
				self.clear_caches()
				logger.info(f'Glider {glider_id} deleted successfully')
				return True

			if status_code == 404:
				st.error(f'Glider {glider_id} not found')
			elif status_code == 403:
				st.error('You do not have permission to delete gliders')

			return False

		except NotFoundError:
			st.error(f'Glider {glider_id} not found')
			return False
		except ForbiddenError:
			st.error('You do not have permission to delete gliders')
			return False
		except BackendException as e:
			st.error(f'Failed to delete glider: {str(e)}')
			logger.error(f'Error deleting glider: {e}')
			return False

	def delete_instrument(self, glider_id: str, instrument_id: int) -> bool:
		"""
		Delete an instrument from a glider.

		Args:
			glider_id: Glider registration number
			instrument_id: Instrument ID

		Returns:
			True if deleted successfully, False otherwise
		"""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return False

		try:
			status_code, response = self._make_request(
				'DELETE',
				f'/api/gliders/{glider_id}/instruments/{instrument_id}',
				retry=False,
			)

			if status_code == 204:
				self.clear_caches()
				logger.info(f'Instrument {instrument_id} deleted successfully')
				return True

			if status_code == 404:
				st.error('Instrument not found')
			elif status_code == 403:
				st.error('You do not have permission to delete instruments')

			return False

		except NotFoundError:
			st.error('Instrument not found')
			return False
		except ForbiddenError:
			st.error('You do not have permission to delete instruments')
			return False
		except BackendException as e:
			logger.warning(f'Instrument deletion not supported by backend: {e}')
			return False

	def update_glider_inventory(self, glider_id: str, instruments: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
		"""
		Update a glider's instruments inventory.

		Args:
			glider_id: Glider registration number
			instruments: List of instrument dicts

		Returns:
			Response dict or None on failure
		"""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return None
		try:
			status_code, response = self._make_request(
				'PUT',
				f'/api/gliders/{glider_id}/instruments',
				data=instruments,
				retry=False,
			)
			if status_code == 200:
				self.clear_caches()
				logger.info(f'Instruments for {glider_id} updated successfully')
				return response
			if status_code == 404:
				st.error(f'Glider {glider_id} not found')
			elif status_code == 403:
				st.error('You do not have permission to update instruments')
			return None
		except NotFoundError:
			st.error(f'Glider {glider_id} not found')
			return None
		except ForbiddenError:
			st.error('You do not have permission to update instruments')
			return None
		except BackendException as e:
			st.error(f'Failed to update instruments: {str(e)}')
			return None

	def save_weighings(self, glider_id: str, weighings: List[Dict[str, Any]]) -> bool:
		"""Save new weighings for a glider."""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return False
		try:
			status_code, response = self._make_request(
				'POST',
				f'/api/gliders/{glider_id}/weighings',
				data=weighings,
				retry=False,
			)
			if status_code == 201:
				self.clear_caches()
				logger.info(f'Weighings for {glider_id} saved successfully')
				return True
			if status_code == 404:
				st.error(f'Glider {glider_id} not found')
			elif status_code == 403:
				st.error('You do not have permission to add weighings')
			return False
		except NotFoundError:
			st.error(f'Glider {glider_id} not found')
			return False
		except ForbiddenError:
			st.error('You do not have permission to add weighings')
			return False
		except BackendException as e:
			st.error(f'Failed to save weighings: {str(e)}')
			return False

	def delete_weighing(self, glider_id: str, weighing_id: int) -> bool:
		"""Delete one weighing from a glider."""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return False

		try:
			status_code, response = self._make_request(
				'DELETE',
				f'/api/gliders/{glider_id}/weighings/{weighing_id}',
				retry=False,
			)

			if status_code == 204:
				self.clear_caches()
				logger.info(f'Weighing {weighing_id} deleted successfully')
				return True

			if status_code == 404:
				st.error('Weighing not found')
			elif status_code == 403:
				st.error('You do not have permission to delete weighings')

			return False

		except NotFoundError:
			st.error('Weighing not found')
			return False
		except ForbiddenError:
			st.error('You do not have permission to delete weighings')
			return False
		except BackendException as e:
			st.error(f'Failed to delete weighing: {str(e)}')
			logger.error(f'Error deleting weighing: {e}')
			return False

	def update_glider_weight_and_balances(self, glider_id: str, weight_and_balances: List) -> Optional[Dict[str, Any]]:
		"""
		Update a glider's weight and balance limit points.

		Args:
			glider_id: Glider registration number
			weight_and_balances: List of [balance, weight] pairs

		Returns:
			Response dict or None on failure
		"""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return None
		try:
			status_code, response = self._make_request(
				'PUT',
				f'/api/gliders/{glider_id}/weight-and-balances',
				data={'weight_and_balances': weight_and_balances},
				retry=False,
			)
			if status_code == 200:
				self.clear_caches()
				logger.info(f'Weight & balances for {glider_id} updated successfully')
				return response
			if status_code == 404:
				st.error(f'Glider {glider_id} not found')
			elif status_code == 403:
				st.error('You do not have permission to update weight and balances')
			return None
		except NotFoundError:
			st.error(f'Glider {glider_id} not found')
			return None
		except ForbiddenError:
			st.error('You do not have permission to update weight and balances')
			return None
		except BackendException as e:
			st.error(f'Failed to update weight and balances: {str(e)}')
			return None

	@staticmethod
	def _get_glider_limits_cached(glider_id: str) -> Optional[Dict[str, Any]]:
		"""Cached version of get_glider_limits"""
		try:
			client = BackendClient()
			if not client.is_authenticated():
				return None

			status_code, response = client._make_request('GET', f'/api/gliders/{glider_id}/limits')
			if status_code == 200:
				return response
			return None
		except BackendException:
			return None

	def get_glider_limits(self, glider_id: str) -> Optional[Dict[str, Any]]:
		"""
		Get CG limits and calculations for a glider with caching (TTL: 1800 seconds).

		Args:
			glider_id: Glider registration number

		Returns:
			Glider calculations dict or None on failure
		"""
		if not self.is_authenticated():
			return None

		try:
			status_code, response = self._make_request('GET', f'/api/gliders/{glider_id}/limits')

			if status_code == 200:
				return response
			elif status_code == 404:
				return None

			return None

		except NotFoundError:
			return None
		except BackendException as e:
			logger.error(f'Error fetching glider limits: {e}')
			return None

	def calculate_weight_balance(
		self,
		glider_id: str,
		front_pilot_weight: float,
		rear_pilot_weight: float = 0,
		front_ballast_weight: float = 0,
		rear_ballast_weight: float = 0,
		wing_water_ballast_weight: float = 0,
	) -> Optional[Dict[str, Any]]:
		"""
		Calculate weight and balance for a glider (NOT cached - live calculation).

		Args:
			glider_id: Glider registration number
			front_pilot_weight: Front pilot weight in kg
			rear_pilot_weight: Rear pilot weight in kg (default: 0)
			front_ballast_weight: Front ballast weight in kg (default: 0)
			rear_ballast_weight: Rear ballast weight in kg (default: 0)
			wing_water_ballast_weight: Water ballast weight in kg (default: 0)

		Returns:
			Weight balance calculation dict with total_weight and center_of_gravity, or None on failure
		"""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return None

		try:
			data = {
				'front_pilot_weight': front_pilot_weight,
				'rear_pilot_weight': rear_pilot_weight,
				'front_ballast_weight': front_ballast_weight,
				'rear_ballast_weight': rear_ballast_weight,
				'wing_water_ballast_weight': wing_water_ballast_weight,
			}

			status_code, response = self._make_request(
				'POST',
				f'/api/gliders/{glider_id}/calculate',
				data=data,
				retry=False,
			)

			if status_code == 200:
				logger.debug(f'W&B calculation: {response}')
				return response

			if status_code == 404:
				st.error(f'Glider {glider_id} not found')
			elif status_code == 400:
				st.error(f'Calculation error: {response.get("detail", "Unknown error")}')

			return None

		except NotFoundError:
			st.error(f'Glider {glider_id} not found')
			return None
		except BackendException as e:
			st.error(f'Calculation failed: {str(e)}')
			logger.error(f'Error calculating weight and balance: {e}')
			return None

	# ===== Audit Methods =====

	@staticmethod
	def _get_audit_logs_cached(
		skip: int = 0,
		limit: int = 100,
		user_id: Optional[str] = None,
		resource_type: Optional[str] = None,
		start_date: Optional[str] = None,
		end_date: Optional[str] = None,
	) -> Optional[Dict[str, Any]]:
		"""Cached version of get_audit_logs"""
		try:
			client = BackendClient()
			if not client.is_authenticated():
				return None

			params = {
				'skip': skip,
				'limit': limit,
				'user_id': user_id,
				'resource_type': resource_type,
				'start_date': start_date,
				'end_date': end_date,
			}
			params = {k: v for k, v in params.items() if v is not None}

			status_code, response = client._make_request('GET', '/api/audit-logs', params=params)
			if status_code == 200:
				return response
			return None
		except BackendException:
			return None

	def get_audit_logs(
		self,
		skip: int = 0,
		limit: int = 100,
		user_id: Optional[str] = None,
		resource_type: Optional[str] = None,
		start_date: Optional[str] = None,
		end_date: Optional[str] = None,
	) -> Optional[Dict[str, Any]]:
		"""
		Get audit logs with optional filtering and caching (TTL: 300 seconds).

		Args:
			skip: Number of records to skip
			limit: Maximum number of records to return
			user_id: Filter by user ID
			resource_type: Filter by resource type
			start_date: Filter entries after this date (ISO 8601)
			end_date: Filter entries before this date (ISO 8601)

		Returns:
			Audit logs dict with total, skip, limit, items or None on failure
		"""
		if not self.is_authenticated():
			return None

		try:
			params = {
				'skip': skip,
				'limit': limit,
				'user_id': user_id,
				'resource_type': resource_type,
				'start_date': start_date,
				'end_date': end_date,
			}
			params = {k: v for k, v in params.items() if v is not None}

			status_code, response = self._make_request('GET', '/api/audit-logs', params=params)

			if status_code == 200:
				return response
			elif status_code == 403:
				st.error('You do not have permission to view audit logs')
				return None

			return None

		except ForbiddenError:
			st.error('You do not have permission to view audit logs')
			return None
		except BackendException as e:
			logger.error(f'Error fetching audit logs: {e}')
			return None

	def log_audit_event(self, event: str) -> bool:
		"""Log a raw audit event for the current authenticated user."""
		if not event or not event.strip():
			return False
		if not self.is_authenticated():
			logger.debug('Skipping audit event: user not authenticated')
			return False
		current_user = st.session_state.get('current_user', {})
		user_id = current_user.get('username')
		if not user_id:
			logger.debug('Skipping audit event: current_user.username missing')
			return False
		try:
			status_code, _ = self._make_request(
				'POST',
				'/api/audit-logs',
				data={'user_id': user_id, 'event': event.strip()},
				retry=False,
			)
			if status_code in (200, 201):
				self.clear_caches()
				return True
			return False
		except BackendException as e:
			logger.warning(f'Failed to log audit event: {e}')
			return False

	def delete_audit_logs(self) -> bool:
		"""Delete all audit logs (admin only)."""
		if not self.is_authenticated():
			st.error('Not authenticated')
			return False
		try:
			status_code, response = self._make_request(
				'DELETE',
				'/api/audit-logs',
				retry=False,
			)
			if status_code == 200:
				self.clear_caches()
				return True
			return False
		except ForbiddenError:
			st.error('You do not have permission to delete audit logs')
			return False
		except BackendException as e:
			st.error(f'Failed to delete audit logs: {str(e)}')
			logger.error(f'Error deleting audit logs: {e}')
			return False

	@staticmethod
	def _get_audit_logs_by_resource_cached(
		resource_type: str,
		resource_id: str,
	) -> Optional[List[Dict[str, Any]]]:
		"""Cached version of get_audit_logs_by_resource"""
		try:
			client = BackendClient()
			if not client.is_authenticated():
				return None

			status_code, response = client._make_request(
				'GET',
				f'/api/audit-logs/resource/{resource_type}/{resource_id}',
			)
			if status_code == 200:
				return response
			return None
		except BackendException:
			return None

	def get_audit_logs_by_resource(
		self,
		resource_type: str,
		resource_id: str,
	) -> Optional[List[Dict[str, Any]]]:
		"""
		Get audit logs for a specific resource with caching (TTL: 3600 seconds).

		Args:
			resource_type: Type of resource (glider, user, etc.)
			resource_id: ID of the resource

		Returns:
			List of audit log entries or None on failure
		"""
		if not self.is_authenticated():
			return None

		try:
			status_code, response = self._make_request(
				'GET',
				f'/api/audit-logs/resource/{resource_type}/{resource_id}',
			)

			if status_code == 200:
				return response
			elif status_code == 404:
				return []

			return None

		except NotFoundError:
			return []
		except BackendException as e:
			logger.error(f'Error fetching audit logs for resource: {e}')
			return None

	# ===== Utility Methods =====

	@staticmethod
	def clear_caches() -> None:
		"""Clear all Streamlit caches"""
		st.cache_data.clear()

	def check_backend_health(self) -> bool:
		"""
		Check if backend is healthy.

		Returns:
			True if backend responds to health check, False otherwise
		"""
		try:
			status_code, response = self._make_request('GET', '/health', retry=False)
			is_healthy = status_code == 200 and response.get('status') == 'healthy'

			if is_healthy:
				logger.info('Backend health check passed')
			else:
				logger.warning(f'Backend health check failed: {response}')

			return is_healthy

		except BackendException as e:
			logger.warning(f'Backend health check failed: {e}')
			return False

	def set_backend_url(self, url: str) -> None:
		"""
		Set backend URL.

		Args:
			url: Backend API URL
		"""
		self.backend_url = url
		logger.info(f'Backend URL set to {url}')

	def get_backend_url(self) -> str:
		"""
		Get current backend URL.

		Returns:
			Backend API URL
		"""
		return self.backend_url
