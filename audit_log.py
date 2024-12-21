from __future__ import annotations

import logging
import duckdb
import pandas as pd

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from config import get_database_name
from datetime import datetime

logger = logging.getLogger(__name__)

@dataclass
class Event:
	timestamp: datetime
	username: str
	event: str

class AuditLog(ABC):
	def __new__(cls):
		if not hasattr(cls, 'instance'):
			cls.instance = super(AuditLog, cls).__new__(cls)
		return cls.instance

	@abstractmethod
	def load_events(self):
		pass

	@abstractmethod
	def log(self, username : str, event : str):
		raise NotImplementedError

class AuditLogDuckDB(AuditLog):
	def set_database_name(self, dbname = '') -> AuditLogDuckDB:
		self.dbname = dbname
		return self

	def get_database_name(self) -> str:
		return self.dbname

	def load_events(self):
		conn = duckdb.connect(self.dbname)
		events = conn.execute("SELECT * FROM AUDITLOG ORDER BY timestamp DESC").df()
		return events
	
	def	delete_events(self):
		conn = duckdb.connect(self.dbname)
		conn.execute("DELETE FROM AUDITLOG")
		conn.close()
		logger.debug('All events deleted from AUDITLOG table.')

	def log(self, username : str, event : str):
		conn = duckdb.connect(self.dbname)
		conn.execute('INSERT INTO AUDITLOG VALUES (?, ?, ?)',[
			datetime.now(),
			username,
			event
		])
		conn.close()
		logger.debug(f'User {username} has logged event [{event}] in AUDITLOG table.')
