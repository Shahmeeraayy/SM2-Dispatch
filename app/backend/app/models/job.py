from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, String, Text, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    job_code = Column(String(50), unique=True, nullable=False)
    status = Column(String(50), nullable=False)
    assigned_tech_id = Column(Uuid(as_uuid=True), ForeignKey("technicians.id"), nullable=True)
    skill_id = Column(Uuid(as_uuid=True), ForeignKey("skills.id"), nullable=True)
    zone_id = Column(Uuid(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    dealership_id = Column(Uuid(as_uuid=True), ForeignKey("dealerships.id"), nullable=True)
    customer_name = Column(String(255), nullable=True)
    customer_address = Column(Text, nullable=True)
    customer_city = Column(String(128), nullable=True)
    customer_state = Column(String(128), nullable=True)
    customer_zip_code = Column(String(32), nullable=True)
    ship_to_name = Column(String(255), nullable=True)
    ship_to_address = Column(Text, nullable=True)
    ship_to_city = Column(String(128), nullable=True)
    ship_to_state = Column(String(128), nullable=True)
    ship_to_zip_code = Column(String(32), nullable=True)
    service_type = Column(String(255), nullable=True)
    hours_worked = Column(Numeric(10, 2), nullable=True)
    rate = Column(Numeric(12, 2), nullable=True)
    location = Column(Text, nullable=True)
    vehicle = Column(String(255), nullable=True)
    tax_code = Column(String(32), nullable=True)
    tax_rate = Column(Numeric(8, 5), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    invoice_id = Column(Uuid(as_uuid=True), ForeignKey("invoices.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    invoice = relationship("Invoice", back_populates="jobs")
