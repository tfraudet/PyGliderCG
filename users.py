import bcrypt
import jwt
import yaml

from streamlit_cookies_controller import CookieController

COOKIE_NAME = '_pyglidercg'
COOKIE_EXPIRY_TIME = 1

class Users:
	def __init__(self, cookie_secret = 'glider-for-ever'):
		self.users =  self.load_users()
		self.cookies = CookieController()
		self.cookie_key = cookie_secret

	def login(self, username: str, password: str) -> bool:
		if username in self.users['credentials']:
			stored_password = self.users['credentials'][username]['password']
			if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
				# set cookie
				token = self.token_encode(username, self.cookie_key)
				# cookies.set(cookie_name, token, expires=datetime.now() + timedelta(hours=cookie_expiry_time), secure=True)
				self.cookies.set(COOKIE_NAME, token, secure=True)
				self.cookies.refresh()
				return True
		return False
	
	def logout(self, username):
		# remove authetication cookie
		self.cookies.remove(COOKIE_NAME) 
		pass

	def load_users(self):
		with open('.streamlit/users.yaml', 'r') as file:
			users = yaml.safe_load(file)
		return users
	
	def get_roles(self, username):
		return self.users['credentials'][username]['roles']

	def token_encode(self, username, key) -> str:
		return jwt.encode({'username': username}, key, algorithm='HS256')

