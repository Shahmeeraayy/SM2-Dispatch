from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError

from .api.endpoints import (
    admin_dealerships,
    admin_email_change_requests,
    admin_reports,
    admin_settings,
    admin_technicians,
    auth,
    invoices,
    signup_requests,
    technician_profile,
    technician_time_off,
)
from .core.config import CORS_ALLOW_ORIGINS

app = FastAPI(
    title="SM2 Dispatch Technician API",
    description="Backend APIs for admin technician profile, scheduling, and availability.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin_technicians.router)
app.include_router(admin_dealerships.router)
app.include_router(admin_email_change_requests.router)
app.include_router(admin_reports.router)
app.include_router(admin_settings.router)
app.include_router(technician_profile.router)
app.include_router(technician_time_off.router)
app.include_router(auth.router)
app.include_router(invoices.router)
app.include_router(signup_requests.public_router)
app.include_router(signup_requests.admin_router)


@app.exception_handler(OperationalError)
def handle_database_operational_error(_: Request, __: OperationalError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database connection failed. Check DATABASE_URL and database settings."},
    )


@app.get("/")
def root():
    return {"message": "SM2 Dispatch technician profile APIs are active."}
