from typing import Optional

from pydantic import BaseModel, Field, field_validator


class InvoiceBrandingSettingsPayload(BaseModel):
    logo_url: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=255)
    street_address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1, max_length=128)
    state: str = Field(..., min_length=1, max_length=128)
    zip_code: str = Field(..., min_length=1, max_length=32)
    phone: str = Field(..., min_length=1, max_length=64)
    email: str = Field(..., min_length=1, max_length=255)
    website: str = Field(..., min_length=1, max_length=255)

    @field_validator("logo_url")
    @classmethod
    def _normalize_optional(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @field_validator("name", "street_address", "city", "state", "zip_code", "phone", "email", "website")
    @classmethod
    def _normalize_required(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("value cannot be blank")
        return normalized


class InvoiceBrandingSettingsResponse(InvoiceBrandingSettingsPayload):
    class Config:
        from_attributes = True
