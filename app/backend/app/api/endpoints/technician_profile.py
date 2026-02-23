from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...api import deps
from ...core.enums import UserRole
from ...core.security import AuthenticatedUser
from ...schemas.technician_profile import (
    EmailChangeRequestCreateRequest,
    EmailChangeRequestResponse,
    TechnicianAvailabilityUpdateRequest,
    TechnicianProfileResponse,
    TechnicianProfileUpdateRequest,
)
from ...services.technician_profile_service import TechnicianProfileService

router = APIRouter(prefix="/technicians/me", tags=["technician-profile"])


@router.get("", response_model=TechnicianProfileResponse)
def get_my_profile(
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).get_profile()


@router.put("", response_model=TechnicianProfileResponse)
def update_my_profile(
    payload: TechnicianProfileUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).update_profile(payload)


@router.put("/availability", response_model=TechnicianProfileResponse)
def update_my_availability(
    payload: TechnicianAvailabilityUpdateRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).update_availability(payload)


@router.post("/email-change-request", response_model=EmailChangeRequestResponse, status_code=201)
def request_email_change(
    payload: EmailChangeRequestCreateRequest,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).request_email_change(payload)


@router.get("/email-change-requests", response_model=List[EmailChangeRequestResponse])
def list_my_email_change_requests(
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.TECHNICIAN)),
):
    return TechnicianProfileService(db, current_user).list_my_email_change_requests()
