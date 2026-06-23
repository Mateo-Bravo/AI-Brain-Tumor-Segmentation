from databases import Database
from sqlalchemy import MetaData
from dotenv import load_dotenv
import os

load_dotenv()  # Carga variables de .env

DATABASE_URL = os.getenv("DATABASE_URL")
database = Database(DATABASE_URL)
metadata = MetaData()
