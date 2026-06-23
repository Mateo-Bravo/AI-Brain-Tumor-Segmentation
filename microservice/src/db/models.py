from sqlalchemy import Table, Column, String, JSON
from sqlalchemy.sql.sqltypes import TIMESTAMP
from src.db.database import metadata

tasks = Table(
    "tasks",
    metadata,
    Column("task_id", String, primary_key=True),
    Column("status", String, nullable=False),
    Column("created_at", TIMESTAMP, nullable=False),
    Column("completed_at", TIMESTAMP, nullable=True),
    Column("results", JSON, nullable=True)
)
