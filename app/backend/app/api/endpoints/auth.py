from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...api import deps
from ...core.config import APP_ENV
from ...core.enums import UserRole
from ...core.security import create_access_token
from ...repositories.technician_repository import TechnicianRepository

router = APIRouter(prefix="/auth", tags=["auth"])


class DevTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    role: UserRole


class DevTechnicianTokenRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=255)


@router.post("/dev/admin-token", response_model=DevTokenResponse)
def create_dev_admin_token():
    if APP_ENV != "development":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)
    token = create_access_token(
        user_id=uuid4(),
        role=UserRole.ADMIN,
        expires_at=expires_at,
    )
    return DevTokenResponse(
        access_token=token,
        expires_at=expires_at,
        role=UserRole.ADMIN,
    )


@router.post("/dev/technician-token", response_model=DevTokenResponse)
def create_dev_technician_token(
    payload: DevTechnicianTokenRequest,
    db: Session = Depends(deps.get_db),
):
    if APP_ENV != "development":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not found",
        )

    normalized_email = payload.email.strip().lower()
    normalized_password = payload.password.strip()
    repo = TechnicianRepository(db)
    technician = repo.get_technician_by_email(normalized_email)
    if technician is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid technician credentials")
    if technician.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Technician account is deactivated")

    stored_password = (technician.password or "").strip()
    if stored_password:
        if normalized_password != stored_password:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid technician credentials")
    elif normalized_password != "tech123":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid technician credentials")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)
    token = create_access_token(
        user_id=technician.id,
        role=UserRole.TECHNICIAN,
        expires_at=expires_at,
    )
    return DevTokenResponse(
        access_token=token,
        expires_at=expires_at,
        role=UserRole.TECHNICIAN,
    )
