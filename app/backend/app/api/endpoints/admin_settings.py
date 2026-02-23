from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...api import deps
from ...core.enums import UserRole
from ...core.security import AuthenticatedUser
from ...schemas.settings import InvoiceBrandingSettingsPayload, InvoiceBrandingSettingsResponse
from ...services.invoice_branding_settings_service import InvoiceBrandingSettingsService

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


@router.get("/invoice-branding", response_model=InvoiceBrandingSettingsResponse)
def get_invoice_branding_settings(
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.ADMIN)),
):
    _ = current_user
    return InvoiceBrandingSettingsService(db).get_invoice_branding()


@router.put("/invoice-branding", response_model=InvoiceBrandingSettingsResponse)
def update_invoice_branding_settings(
    payload: InvoiceBrandingSettingsPayload,
    db: Session = Depends(deps.get_db),
    current_user: AuthenticatedUser = Depends(deps.require_roles(UserRole.ADMIN)),
):
    _ = current_user
    return InvoiceBrandingSettingsService(db).upsert_invoice_branding(payload)
