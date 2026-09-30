from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview", response_model=schemas.AnalyticsOverviewResponse)
def get_overview(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_overview_analytics(db, current_user, start_date, end_date)


@router.get("/events", response_model=schemas.EventAnalyticsResponse)
def get_events(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_event_analytics(db, current_user, start_date, end_date)


@router.get("/registrations", response_model=schemas.RegistrationAnalyticsResponse)
def get_registrations(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_registration_analytics(db, current_user, start_date, end_date)


@router.get("/attendance", response_model=schemas.AttendanceAnalyticsResponse)
def get_attendance(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_attendance_analytics(db, current_user, start_date, end_date)


@router.get("/od", response_model=schemas.ODAnalyticsResponse)
def get_od(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_od_analytics(db, current_user, start_date, end_date)


@router.get("/certificates", response_model=schemas.CertificateAnalyticsResponse)
def get_certificates(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_certificate_analytics(db, current_user, start_date, end_date)


@router.get("/badges", response_model=schemas.BadgeAnalyticsResponse)
def get_badges(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_badge_analytics(db, current_user, start_date, end_date)


@router.get("/student", response_model=schemas.StudentAnalyticsResponse)
def get_student_analytics(
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_student_analytics(db, current_user, start_date, end_date)


@router.get("/club/{club_id}", response_model=schemas.ClubAnalyticsResponse)
def get_club_analytics(
    club_id: int,
    start_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="ISO date filter (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return analytics_service.get_club_analytics(db, current_user, club_id, start_date, end_date)
