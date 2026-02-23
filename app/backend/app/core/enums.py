from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    TECHNICIAN = "technician"


class TechnicianStatus(str, Enum):
    ACTIVE = "active"
    DEACTIVATED = "deactivated"


class DealershipStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class TimeOffEntryType(str, Enum):
    FULL_DAY = "full_day"
    MULTI_DAY = "multi_day"
    HALF_DAY_MORNING = "half_day_morning"
    HALF_DAY_AFTERNOON = "half_day_afternoon"
    BREAK = "break"


class AuditEntityType(str, Enum):
    TECHNICIAN = "technician"
    DEALERSHIP = "dealership"
    TECHNICIAN_ZONE = "technician_zone"
    TECHNICIAN_SKILL = "technician_skill"
    TECHNICIAN_SCHEDULE = "technician_schedule"
    TECHNICIAN_TIME_OFF = "technician_time_off"
    TECHNICIAN_EMAIL_CHANGE_REQUEST = "technician_email_change_request"
    JOB = "job"
    INVOICE = "invoice"
