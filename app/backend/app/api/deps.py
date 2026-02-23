from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from ..core.config import DATABASE_URL
from ..core.enums import UserRole
from ..core.security import AuthenticatedUser, decode_access_token
from ..models import *  # noqa: F401,F403
from ..models.base import Base

is_sqlite = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)

if is_sqlite:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def _ensure_sqlite_schema() -> None:
    if not is_sqlite:
        return

    with engine.begin() as conn:
        Base.metadata.create_all(bind=conn)

        def ensure_column(table_name: str, column_name: str, ddl: str) -> None:
            columns = {
                row[1]
                for row in conn.exec_driver_sql(f"PRAGMA table_info('{table_name}')").fetchall()
            }
            if columns and column_name not in columns:
                conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}")

        columns = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info('technicians')").fetchall()
        }
        if columns and "password" not in columns:
            conn.exec_driver_sql("ALTER TABLE technicians ADD COLUMN password VARCHAR(255)")
        ensure_column("technicians", "full_name", "VARCHAR(255)")
        ensure_column("technicians", "profile_picture_url", "TEXT")
        ensure_column("technicians", "working_days", "TEXT DEFAULT '[]' NOT NULL")
        ensure_column("technicians", "working_hours_start", "TIME")
        ensure_column("technicians", "working_hours_end", "TIME")
        ensure_column("technicians", "after_hours_enabled", "BOOLEAN DEFAULT 0 NOT NULL")
        ensure_column("technicians", "updated_by", "CHAR(32)")

        ensure_column("jobs", "dealership_id", "CHAR(32)")
        ensure_column("jobs", "customer_name", "VARCHAR(255)")
        ensure_column("jobs", "customer_address", "TEXT")
        ensure_column("jobs", "customer_city", "VARCHAR(128)")
        ensure_column("jobs", "customer_state", "VARCHAR(128)")
        ensure_column("jobs", "customer_zip_code", "VARCHAR(32)")
        ensure_column("jobs", "ship_to_name", "VARCHAR(255)")
        ensure_column("jobs", "ship_to_address", "TEXT")
        ensure_column("jobs", "ship_to_city", "VARCHAR(128)")
        ensure_column("jobs", "ship_to_state", "VARCHAR(128)")
        ensure_column("jobs", "ship_to_zip_code", "VARCHAR(32)")
        ensure_column("jobs", "service_type", "VARCHAR(255)")
        ensure_column("jobs", "hours_worked", "NUMERIC(10,2)")
        ensure_column("jobs", "rate", "NUMERIC(12,2)")
        ensure_column("jobs", "location", "TEXT")
        ensure_column("jobs", "vehicle", "VARCHAR(255)")
        ensure_column("jobs", "tax_code", "VARCHAR(32)")
        ensure_column("jobs", "tax_rate", "NUMERIC(8,5)")
        ensure_column("jobs", "completed_at", "DATETIME")
        ensure_column("jobs", "invoice_id", "CHAR(32)")


_ensure_sqlite_schema()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme)) -> AuthenticatedUser:
    return decode_access_token(token)


def require_roles(*allowed_roles: UserRole):
    def dependency(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this resource",
            )
        return current_user

    return dependency
