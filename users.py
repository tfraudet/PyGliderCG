import bcrypt
import jwt
import yaml
import logging

import duckdb
import pandas as pd
import streamlit as st

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
# from streamlit_cookies_controller import CookieController
from config import get_database_name

COOKIE_NAME = '_pyglidercg'
COOKIE_EXPIRY_TIME = 1

logger = logging.getLogger(__name__)

@st.cache_data
def fetch_users(show_spinner = 'Loading users'):
	return UsersDuckDB(cookie_secret=st.secrets['COOKIE_KEY'], dbname=get_database_name())

@dataclass
class User:
	username: str
	email: str
	password: str
	role: str

class Users(ABC):
	def __init__(self, cookie_secret = 'glider-for-ever'):
		self.users =  self.load_users()
		# self.cookies = CookieController()
		self.cookie_key = cookie_secret

	def login(self, username: str, password: str) -> bool:
		user = self.get_user(username)
		logger.debug('Try to log {} with password {}'.format(user, password))
		if user is not None:
			stored_password = user.password
			if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
				# set cookie
				token = self.token_encode(username, self.cookie_key)
				# cookies.set(cookie_name, token, expires=datetime.now() + timedelta(hours=cookie_expiry_time), secure=True)
				# self.cookies.set(COOKIE_NAME, token, secure=True)
				# self.cookies.refresh()
				return True
		return False
	
	def logout(self, username):
		# remove authetication cookie
		# self.cookies.remove(COOKIE_NAME) 
		pass

	@abstractmethod
	def load_users(self):
		pass

	@abstractmethod
	def get_user(self, username : str) -> User:
		pass

	def get_role(self, username):
		return self.get_user(username).role
	
	def is_admin(self, username) -> bool:
		return self.get_role(username) == "administrator" 

	def is_editor(self, username) -> bool:
		return self.get_role(username) == "editor" 
	
	def get_users(self):
		return self.users
	
	def find_by_username(self, username : str):
		return None

	def token_encode(self, username, key) -> str:
		return jwt.encode({'username': username}, key, algorithm='HS256')
	
class UsersDuckDB(Users):
	def __init__(self, cookie_secret = 'glider-for-ever', dbname = ''):
		self.dbname = dbname
		super().__init__(cookie_secret = cookie_secret)

	def load_users(self):
		conn = duckdb.connect(self.dbname)
		# users = conn.execute("SELECT * FROM USERS").fetchall()
		users = conn.execute("SELECT * FROM USERS").df()
		logger.debug('in UsersDuckDB.load_users() users is\n {}'.format(users))
		return users

	def get_user(self, username : str) -> User:
		return self.find_by_username(username)
	
	def find_by_username(self, username: str):
		list_of_username = self.users['username'].unique().tolist()
		if username in list_of_username:
			user_row = self.users[self.users['username'] == username]
			return User(
				username,
				user_row['email'].values[0],
				user_row['password'].values[0],
				user_row['role'].values[0]
			)
		else:
			return None
	
	def create(self, user : User):
		logger.debug('User to create in DB is {}'.format(user))
		conn = duckdb.connect(self.dbname)
		conn.execute('INSERT INTO USERS VALUES (?, ?, ?, ?)',[
			user.username,
			user.email,
			bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()),
			user.role
		])
		conn.close()
	
	def update(self, user : User):
		logger.debug('User to update in DB is {}'.format(user))
		conn = duckdb.connect(self.dbname)

		# Encrypt the password if not yet done
		if not user.password.startswith('$2b$12$'):
			user.password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
	
		# could also use 'INSERT OR REPLACE INTO USERS VALUES (?, ?, ?, ?)'
		sql = '''
			INSERT INTO USERS VALUES (?, ?, ?, ?)
			ON CONFLICT(username) DO UPDATE SET
				email = EXCLUDED.email,
				password = EXCLUDED.password,
				role = EXCLUDED.role
		'''
		conn.execute(sql,[
			user.username,
			user.email,
			user.password,
			user.role
		])
		conn.close()

	
	def delete(self, username: str):
		logger.debug('User to delete in DB is {}'.format(username))
		conn = duckdb.connect(self.dbname)
		conn.execute('DELETE FROM USERS WHERE username=\'{}\''.format(username))
		conn.close()
	






