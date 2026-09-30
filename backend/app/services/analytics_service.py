from typing import List, Optional, Tuple
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct

from app import models, schemas


def parse_date_filters(start_date: Optional[str], end_date: Optional[str]) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Parses optional start_date and end_date strings into datetime objects.
    Validates that start_date <= end_date.
    """
    start_dt = None
    end_dt = None

    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format for start_date. Use YYYY-MM-DD or ISO format."
            )

    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.strip())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format for end_date. Use YYYY-MM-DD or ISO format."
            )

    if start_dt and end_dt and start_dt > end_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before or equal to end_date."
        )

    return start_dt, end_dt


def get_user_administered_club_ids(db: Session, user: models.User) -> Optional[List[int]]:
    """
    Returns list of club IDs accessible to the user based on their system role,
    or None if unconstrained (Super Admin / Admin).
    """
    if user.system_role in ["SUPER_ADMIN", "ADMIN"]:
        return None
    elif user.system_role == "CLUB_ADMIN":
        clubs = db.query(models.Club.id).filter(models.Club.club_admin_id == user.id).all()
        return [c[0] for c in clubs]
    elif user.system_role == "FACULTY":
        clubs = db.query(models.Club.id).filter(models.Club.faculty_coordinator_id == user.id).all()
        return [c[0] for c in clubs]
    else:
        memberships = db.query(models.ClubMember.club_id).filter(
            models.ClubMember.user_id == user.id,
            models.ClubMember.status == "ACTIVE"
        ).all()
        return [m[0] for m in memberships]


def get_overview_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.AnalyticsOverviewResponse:
    """
    Returns high-level overview analytics for authorized administrative roles.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Students should use /api/analytics/student."
        )

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    club_ids = get_user_administered_club_ids(db, user)

    # User counts
    total_users = db.query(func.count(models.User.id)).scalar() or 0
    total_students = db.query(func.count(models.User.id)).filter(models.User.system_role == "STUDENT").scalar() or 0
    total_faculty = db.query(func.count(models.User.id)).filter(models.User.system_role == "FACULTY").scalar() or 0

    # Clubs count
    club_query = db.query(func.count(models.Club.id))
    if club_ids is not None:
        club_query = club_query.filter(models.Club.id.in_(club_ids))
    total_clubs = club_query.scalar() or 0

    # Event query
    event_q = db.query(models.Event)
    if club_ids is not None:
        event_q = event_q.filter(models.Event.club_id.in_(club_ids))
    if start_dt:
        event_q = event_q.filter(models.Event.start_time >= start_dt)
    if end_dt:
        event_q = event_q.filter(models.Event.start_time <= end_dt)

    all_events = event_q.all()
    event_ids = [e.id for e in all_events]

    total_events = len(all_events)
    draft_events = sum(1 for e in all_events if e.status == "DRAFT")
    pending_approval_events = sum(1 for e in all_events if e.status == "PENDING_FACULTY_APPROVAL")
    approved_events = sum(1 for e in all_events if e.status == "APPROVED")
    rejected_events = sum(1 for e in all_events if e.status == "REJECTED")
    ongoing_events = sum(1 for e in all_events if e.status == "ONGOING")
    completed_events = sum(1 for e in all_events if e.status == "COMPLETED")
    cancelled_events = sum(1 for e in all_events if e.status == "CANCELLED")

    # Registrations & Attendance
    total_registrations = 0
    total_attendance_records = 0
    if event_ids:
        total_registrations = db.query(func.count(models.EventRegistration.id)).filter(
            models.EventRegistration.event_id.in_(event_ids)
        ).scalar() or 0

        total_attendance_records = db.query(func.count(models.Attendance.id)).filter(
            models.Attendance.event_id.in_(event_ids)
        ).scalar() or 0

    # OD Requests
    od_q = db.query(models.ODRequest)
    if user.system_role == "FACULTY":
        od_q = od_q.filter(models.ODRequest.mentor_id == user.id)
    elif event_ids:
        od_q = od_q.filter(models.ODRequest.event_id.in_(event_ids))

    all_ods = od_q.all()
    total_od_requests = len(all_ods)
    pending_od_requests = sum(1 for od in all_ods if od.status == "PENDING")
    approved_od_requests = sum(1 for od in all_ods if od.status == "APPROVED")
    rejected_od_requests = sum(1 for od in all_ods if od.status == "REJECTED")

    # Certificates & Badges
    total_certificates_issued = 0
    if event_ids:
        total_certificates_issued = db.query(func.count(models.Certificate.id)).filter(
            models.Certificate.event_id.in_(event_ids)
        ).scalar() or 0
    else:
        total_certificates_issued = db.query(func.count(models.Certificate.id)).scalar() or 0

    total_badges_awarded = db.query(func.count(models.StudentBadge.id)).scalar() or 0

    return schemas.AnalyticsOverviewResponse(
        total_users=total_users,
        total_students=total_students,
        total_faculty=total_faculty,
        total_clubs=total_clubs,
        total_events=total_events,
        draft_events=draft_events,
        pending_approval_events=pending_approval_events,
        approved_events=approved_events,
        rejected_events=rejected_events,
        ongoing_events=ongoing_events,
        completed_events=completed_events,
        cancelled_events=cancelled_events,
        total_registrations=total_registrations,
        total_attendance_records=total_attendance_records,
        total_od_requests=total_od_requests,
        pending_od_requests=pending_od_requests,
        approved_od_requests=approved_od_requests,
        rejected_od_requests=rejected_od_requests,
        total_certificates_issued=total_certificates_issued,
        total_badges_awarded=total_badges_awarded
    )


def get_event_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.EventAnalyticsResponse:
    """
    Returns event lifecycle metrics and capacity utilization.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    club_ids = get_user_administered_club_ids(db, user)

    q = db.query(models.Event)
    if club_ids is not None:
        q = q.filter(models.Event.club_id.in_(club_ids))
    if start_dt:
        q = q.filter(models.Event.start_time >= start_dt)
    if end_dt:
        q = q.filter(models.Event.start_time <= end_dt)

    events = q.all()
    event_ids = [e.id for e in events]

    total_events = len(events)
    draft = sum(1 for e in events if e.status == "DRAFT")
    pending = sum(1 for e in events if e.status == "PENDING_FACULTY_APPROVAL")
    approved = sum(1 for e in events if e.status == "APPROVED")
    rejected = sum(1 for e in events if e.status == "REJECTED")
    ongoing = sum(1 for e in events if e.status == "ONGOING")
    completed = sum(1 for e in events if e.status == "COMPLETED")
    cancelled = sum(1 for e in events if e.status == "CANCELLED")

    total_capacity = sum(e.capacity for e in events)

    total_registrations = 0
    if event_ids:
        total_registrations = db.query(func.count(models.EventRegistration.id)).filter(
            models.EventRegistration.event_id.in_(event_ids)
        ).scalar() or 0

    utilization_pct = round((total_registrations / total_capacity) * 100.0, 2) if total_capacity > 0 else 0.0

    return schemas.EventAnalyticsResponse(
        total_events=total_events,
        draft=draft,
        pending=pending,
        approved=approved,
        rejected=rejected,
        ongoing=ongoing,
        completed=completed,
        cancelled=cancelled,
        total_capacity=total_capacity,
        total_registrations=total_registrations,
        capacity_utilization_pct=utilization_pct
    )


def get_registration_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.RegistrationAnalyticsResponse:
    """
    Calculates event registrations, registrations per club, and average per event.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    club_ids = get_user_administered_club_ids(db, user)

    event_q = db.query(models.Event)
    if club_ids is not None:
        event_q = event_q.filter(models.Event.club_id.in_(club_ids))
    if start_dt:
        event_q = event_q.filter(models.Event.start_time >= start_dt)
    if end_dt:
        event_q = event_q.filter(models.Event.start_time <= end_dt)

    events = event_q.all()
    event_ids = [e.id for e in events]

    if not event_ids:
        return schemas.RegistrationAnalyticsResponse(
            total_registrations=0,
            average_registrations_per_event=0.0,
            registrations_by_event=[],
            registrations_by_club=[]
        )

    total_registrations = db.query(func.count(models.EventRegistration.id)).filter(
        models.EventRegistration.event_id.in_(event_ids)
    ).scalar() or 0

    num_events = len(events)
    avg_per_event = round(total_registrations / num_events, 2) if num_events > 0 else 0.0

    # Registrations by Event
    reg_by_event_raw = db.query(
        models.EventRegistration.event_id,
        models.Event.title,
        func.count(models.EventRegistration.id)
    ).join(models.Event, models.EventRegistration.event_id == models.Event.id)\
     .filter(models.EventRegistration.event_id.in_(event_ids))\
     .group_by(models.EventRegistration.event_id, models.Event.title).all()

    by_event = [
        schemas.EventRegistrationStat(event_id=eid, event_title=title, registration_count=cnt)
        for eid, title, cnt in reg_by_event_raw
    ]

    # Registrations by Club
    reg_by_club_raw = db.query(
        models.Club.id,
        models.Club.name,
        func.count(models.EventRegistration.id)
    ).join(models.Event, models.EventRegistration.event_id == models.Event.id)\
     .join(models.Club, models.Event.club_id == models.Club.id)\
     .filter(models.EventRegistration.event_id.in_(event_ids))\
     .group_by(models.Club.id, models.Club.name).all()

    by_club = [
        schemas.ClubRegistrationStat(club_id=cid, club_name=cname, registration_count=cnt)
        for cid, cname, cnt in reg_by_club_raw
    ]

    return schemas.RegistrationAnalyticsResponse(
        total_registrations=total_registrations,
        average_registrations_per_event=avg_per_event,
        registrations_by_event=by_event,
        registrations_by_club=by_club
    )


def get_attendance_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.AttendanceAnalyticsResponse:
    """
    Calculates total attendance, unique students, and overall attendance rate.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    club_ids = get_user_administered_club_ids(db, user)

    event_q = db.query(models.Event)
    if club_ids is not None:
        event_q = event_q.filter(models.Event.club_id.in_(club_ids))
    if start_dt:
        event_q = event_q.filter(models.Event.start_time >= start_dt)
    if end_dt:
        event_q = event_q.filter(models.Event.start_time <= end_dt)

    events = event_q.all()
    event_ids = [e.id for e in events]

    if not event_ids:
        return schemas.AttendanceAnalyticsResponse(
            total_attendance_records=0,
            unique_students_attended=0,
            attendance_rate_pct=0.0,
            attendance_by_club=[]
        )

    total_attendance = db.query(func.count(models.Attendance.id)).filter(
        models.Attendance.event_id.in_(event_ids)
    ).scalar() or 0

    unique_students = db.query(func.count(distinct(models.Attendance.student_id))).filter(
        models.Attendance.event_id.in_(event_ids)
    ).scalar() or 0

    total_registrations = db.query(func.count(models.EventRegistration.id)).filter(
        models.EventRegistration.event_id.in_(event_ids)
    ).scalar() or 0

    att_rate = round((total_attendance / total_registrations) * 100.0, 2) if total_registrations > 0 else 0.0

    att_by_club_raw = db.query(
        models.Club.id,
        models.Club.name,
        func.count(models.Attendance.id)
    ).join(models.Event, models.Attendance.event_id == models.Event.id)\
     .join(models.Club, models.Event.club_id == models.Club.id)\
     .filter(models.Attendance.event_id.in_(event_ids))\
     .group_by(models.Club.id, models.Club.name).all()

    by_club = [
        schemas.ClubAttendanceStat(club_id=cid, club_name=cname, attendance_count=cnt)
        for cid, cname, cnt in att_by_club_raw
    ]

    return schemas.AttendanceAnalyticsResponse(
        total_attendance_records=total_attendance,
        unique_students_attended=unique_students,
        attendance_rate_pct=att_rate,
        attendance_by_club=by_club
    )


def get_od_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.ODAnalyticsResponse:
    """
    Calculates OD Request counts and timetable period impacts.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    club_ids = get_user_administered_club_ids(db, user)

    od_q = db.query(models.ODRequest)
    if user.system_role == "FACULTY":
        od_q = od_q.filter(models.ODRequest.mentor_id == user.id)
    elif club_ids is not None:
        event_ids = [e.id for e in db.query(models.Event.id).filter(models.Event.club_id.in_(club_ids)).all()]
        od_q = od_q.filter(models.ODRequest.event_id.in_(event_ids))

    if start_dt:
        od_q = od_q.filter(models.ODRequest.created_at >= start_dt)
    if end_dt:
        od_q = od_q.filter(models.ODRequest.created_at <= end_dt)

    all_ods = od_q.all()
    od_ids = [od.id for od in all_ods]

    total_od = len(all_ods)
    pending = sum(1 for od in all_ods if od.status == "PENDING")
    approved = sum(1 for od in all_ods if od.status == "APPROVED")
    rejected = sum(1 for od in all_ods if od.status == "REJECTED")

    affected_periods = 0
    if od_ids:
        affected_periods = db.query(func.count(models.ODPeriodSnapshot.id)).filter(
            models.ODPeriodSnapshot.od_request_id.in_(od_ids)
        ).scalar() or 0

    return schemas.ODAnalyticsResponse(
        total_od_requests=total_od,
        pending=pending,
        approved=approved,
        rejected=rejected,
        total_affected_periods=affected_periods
    )


def get_certificate_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.CertificateAnalyticsResponse:
    """
    Calculates certificate metrics across events.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    start_dt, end_dt = parse_date_filters(start_date, end_date)
    club_ids = get_user_administered_club_ids(db, user)

    cert_q = db.query(models.Certificate)
    if club_ids is not None:
        event_ids = [e.id for e in db.query(models.Event.id).filter(models.Event.club_id.in_(club_ids)).all()]
        cert_q = cert_q.filter(models.Certificate.event_id.in_(event_ids))

    if start_dt:
        cert_q = cert_q.filter(models.Certificate.issued_at >= start_dt)
    if end_dt:
        cert_q = cert_q.filter(models.Certificate.issued_at <= end_dt)

    all_certs = cert_q.all()
    total_certs = len(all_certs)

    certs_by_event_raw = db.query(
        models.Certificate.event_id,
        models.Event.title,
        func.count(models.Certificate.id)
    ).join(models.Event, models.Certificate.event_id == models.Event.id)\
     .group_by(models.Certificate.event_id, models.Event.title).all()

    by_event = [
        schemas.EventCertificateStat(event_id=eid, event_title=title, certificate_count=cnt)
        for eid, title, cnt in certs_by_event_raw
    ]

    return schemas.CertificateAnalyticsResponse(
        total_certificates_issued=total_certs,
        certificates_by_event=by_event
    )


def get_badge_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.BadgeAnalyticsResponse:
    """
    Calculates badge awards and distinct student counts.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    start_dt, end_dt = parse_date_filters(start_date, end_date)

    q = db.query(models.StudentBadge)
    if start_dt:
        q = q.filter(models.StudentBadge.awarded_at >= start_dt)
    if end_dt:
        q = q.filter(models.StudentBadge.awarded_at <= end_dt)

    total_badges = q.count()
    unique_students = db.query(func.count(distinct(models.StudentBadge.student_id))).scalar() or 0

    badge_types_raw = db.query(
        models.Badge.id,
        models.Badge.name,
        func.count(models.StudentBadge.id)
    ).join(models.StudentBadge, models.Badge.id == models.StudentBadge.badge_id)\
     .group_by(models.Badge.id, models.Badge.name).all()

    by_type = [
        schemas.BadgeTypeStat(badge_id=bid, badge_name=bname, awarded_count=cnt)
        for bid, bname, cnt in badge_types_raw
    ]

    return schemas.BadgeAnalyticsResponse(
        total_badges_awarded=total_badges,
        unique_students_with_badges=unique_students,
        badges_by_type=by_type
    )


def get_student_analytics(
    db: Session,
    user: models.User,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.StudentAnalyticsResponse:
    """
    Returns student-specific activity analytics for current_user.id.
    """
    start_dt, end_dt = parse_date_filters(start_date, end_date)
    student_id = user.id

    events_registered = db.query(func.count(models.EventRegistration.id)).filter(
        models.EventRegistration.student_id == student_id,
        models.EventRegistration.status != "CANCELLED"
    ).scalar() or 0

    events_attended = db.query(func.count(distinct(models.Attendance.event_id))).filter(
        models.Attendance.student_id == student_id
    ).scalar() or 0

    att_rate = round((events_attended / events_registered) * 100.0, 2) if events_registered > 0 else 0.0

    od_requests = db.query(func.count(models.ODRequest.id)).filter(
        models.ODRequest.student_id == student_id
    ).scalar() or 0

    od_approved = db.query(func.count(models.ODRequest.id)).filter(
        models.ODRequest.student_id == student_id,
        models.ODRequest.status == "APPROVED"
    ).scalar() or 0

    od_rejected = db.query(func.count(models.ODRequest.id)).filter(
        models.ODRequest.student_id == student_id,
        models.ODRequest.status == "REJECTED"
    ).scalar() or 0

    certs = db.query(func.count(models.Certificate.id)).filter(
        models.Certificate.student_id == student_id
    ).scalar() or 0

    badges = db.query(func.count(models.StudentBadge.id)).filter(
        models.StudentBadge.student_id == student_id
    ).scalar() or 0

    # Clubs participated (distinct clubs from registrations or memberships)
    reg_club_ids = db.query(models.Event.club_id).join(
        models.EventRegistration, models.EventRegistration.event_id == models.Event.id
    ).filter(models.EventRegistration.student_id == student_id).distinct().all()

    mem_club_ids = db.query(models.ClubMember.club_id).filter(
        models.ClubMember.user_id == student_id,
        models.ClubMember.status == "ACTIVE"
    ).distinct().all()

    all_participated_clubs = {c[0] for c in reg_club_ids}.union({c[0] for c in mem_club_ids})

    return schemas.StudentAnalyticsResponse(
        events_registered=events_registered,
        events_attended=events_attended,
        attendance_rate=att_rate,
        od_requests=od_requests,
        od_approved=od_approved,
        od_rejected=od_rejected,
        certificates=certs,
        badges=badges,
        clubs_participated=len(all_participated_clubs)
    )


def get_club_analytics(
    db: Session,
    user: models.User,
    club_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> schemas.ClubAnalyticsResponse:
    """
    Returns analytics for a specific club. Enforces server-side authorization check.
    """
    start_dt, end_dt = parse_date_filters(start_date, end_date)
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Club not found."
        )

    # Server-Side Authorization Check
    authorized = False
    if user.system_role in ["SUPER_ADMIN", "ADMIN"]:
        authorized = True
    elif user.system_role == "CLUB_ADMIN" and club.club_admin_id == user.id:
        authorized = True
    elif user.system_role == "FACULTY" and club.faculty_coordinator_id == user.id:
        authorized = True
    else:
        # Check membership with administrative role in dynamic roles or President/Lead role_name
        member = db.query(models.ClubMember).filter(
            models.ClubMember.club_id == club_id,
            models.ClubMember.user_id == user.id,
            models.ClubMember.status == "ACTIVE"
        ).first()
        if member and member.role_name in ["President", "Vice President", "Lead", "ADMIN"]:
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You are not authorized to view analytics for this club."
        )

    # Calculate metrics for the club
    event_q = db.query(models.Event).filter(models.Event.club_id == club_id)
    if start_dt:
        event_q = event_q.filter(models.Event.start_time >= start_dt)
    if end_dt:
        event_q = event_q.filter(models.Event.start_time <= end_dt)

    club_events = event_q.all()
    event_ids = [e.id for e in club_events]

    total_events = len(club_events)
    approved_events = sum(1 for e in club_events if e.status == "APPROVED")
    rejected_events = sum(1 for e in club_events if e.status == "REJECTED")
    completed_events = sum(1 for e in club_events if e.status == "COMPLETED")

    total_registrations = 0
    unique_participants = 0
    total_attendance = 0
    if event_ids:
        total_registrations = db.query(func.count(models.EventRegistration.id)).filter(
            models.EventRegistration.event_id.in_(event_ids)
        ).scalar() or 0

        unique_participants = db.query(func.count(distinct(models.EventRegistration.student_id))).filter(
            models.EventRegistration.event_id.in_(event_ids)
        ).scalar() or 0

        total_attendance = db.query(func.count(models.Attendance.id)).filter(
            models.Attendance.event_id.in_(event_ids)
        ).scalar() or 0

    att_rate = round((total_attendance / total_registrations) * 100.0, 2) if total_registrations > 0 else 0.0

    od_requests = 0
    if event_ids:
        od_requests = db.query(func.count(models.ODRequest.id)).filter(
            models.ODRequest.event_id.in_(event_ids)
        ).scalar() or 0

    certs_issued = 0
    if event_ids:
        certs_issued = db.query(func.count(models.Certificate.id)).filter(
            models.Certificate.event_id.in_(event_ids)
        ).scalar() or 0

    badges_earned = db.query(func.count(distinct(models.StudentBadge.id))).join(
        models.Attendance, models.StudentBadge.student_id == models.Attendance.student_id
    ).filter(models.Attendance.event_id.in_(event_ids)).scalar() if event_ids else 0

    return schemas.ClubAnalyticsResponse(
        club_id=club.id,
        club_name=club.name,
        total_events=total_events,
        approved_events=approved_events,
        rejected_events=rejected_events,
        completed_events=completed_events,
        total_registrations=total_registrations,
        unique_participants=unique_participants,
        total_attendance=total_attendance,
        attendance_rate_pct=att_rate,
        od_requests=od_requests,
        certificates_issued=certs_issued,
        badges_earned=badges_earned or 0
    )
