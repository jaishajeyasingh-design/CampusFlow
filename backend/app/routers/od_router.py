from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/od-requests", tags=["OD Management"])


@router.get("", response_model=List[schemas.ODRequestResponse])
def list_od_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if current_user.system_role == "STUDENT":
        return db.query(models.ODRequest).filter(models.ODRequest.student_id == current_user.id).all()
    elif current_user.system_role == "FACULTY":
        return db.query(models.ODRequest).filter(models.ODRequest.mentor_id == current_user.id).all()
    elif current_user.system_role in ["SUPER_ADMIN", "ADMIN"]:
        return db.query(models.ODRequest).all()
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


@router.post("", response_model=schemas.ODRequestResponse, status_code=status.HTTP_201_CREATED)
def create_od_request(
    od_in: schemas.ODRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("STUDENT"))
):
    # Determine Event and Registration
    reg = None
    event = None

    if od_in.registration_id:
        reg = db.query(models.EventRegistration).filter(models.EventRegistration.id == od_in.registration_id).first()
        if not reg or reg.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid registration ID or registration does not belong to current student."
            )
        event = reg.event
    elif od_in.event_id:
        event = db.query(models.Event).filter(models.Event.id == od_in.event_id).first()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
        reg = db.query(models.EventRegistration).filter(
            models.EventRegistration.event_id == od_in.event_id,
            models.EventRegistration.student_id == current_user.id
        ).first()
        if not reg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Student is not registered for this event."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide event_id or registration_id."
        )

    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    # Event Status Validation
    if event.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request OD for event with status '{event.status}'. OD requests are allowed ONLY for APPROVED events."
        )

    # Duplicate OD Protection
    existing_od = db.query(models.ODRequest).filter(
        models.ODRequest.student_id == current_user.id,
        models.ODRequest.event_id == event.id
    ).first()

    if existing_od:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An OD request already exists for this event registration."
        )

    # Find Active Timetable Structure
    active_tt = db.query(models.TimetableStructure).filter(models.TimetableStructure.is_active == True).first()
    if not active_tt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active timetable structure found."
        )

    # Working Day Check
    event_day = event.start_time.strftime("%a").upper()
    working_days_list = [d.strip().upper() for d in active_tt.working_days.split(",") if d.strip()]
    if event_day not in working_days_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active timetable configured for event day '{event_day}'."
        )

    # Calculate Affected Overlapping Periods (Half-Open Interval)
    event_start_t = event.start_time.time()
    event_end_t = event.end_time.time()
    affected_periods = []

    for p in active_tt.periods:
        try:
            p_start_t = datetime.strptime(p.start_time, "%H:%M").time()
            p_end_t = datetime.strptime(p.end_time, "%H:%M").time()
        except ValueError:
            continue

        if event_start_t < p_end_t and event_end_t > p_start_t:
            affected_periods.append(p)

    if not affected_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No academic timetable periods overlap with the event time."
        )

    # Mentor Assignment
    mentor_id = current_user.class_mentor_id
    if not mentor_id and event.club:
        mentor_id = event.club.faculty_coordinator_id

    if not mentor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No class mentor or faculty coordinator assigned for this OD request."
        )

    # Create OD Request & Period Snapshots Transactionally
    new_od = models.ODRequest(
        student_id=current_user.id,
        event_id=event.id,
        mentor_id=mentor_id,
        status="PENDING"
    )
    db.add(new_od)
    db.flush()

    period_date_str = event.start_time.strftime("%Y-%m-%d")
    for p in affected_periods:
        snap = models.ODPeriodSnapshot(
            od_request_id=new_od.id,
            period_date=period_date_str,
            period_number=p.period_number,
            period_name=f"Period {p.period_number}",
            start_time=p.start_time,
            end_time=p.end_time,
            period_type=p.period_type
        )
        db.add(snap)

    audit = models.AuditLog(
        user_id=current_user.id,
        action="OD_REQUEST_CREATED",
        entity="od_requests",
        entity_id=new_od.id,
        new_value=f"Created OD request for event '{event.title}' (ID: {event.id})"
    )
    db.add(audit)

    db.commit()
    db.refresh(new_od)
    return new_od


@router.get("/{od_id}", response_model=schemas.ODRequestResponse)
def get_od_request_by_id(
    od_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    od_req = db.query(models.ODRequest).filter(models.ODRequest.id == od_id).first()
    if not od_req:
        raise HTTPException(status_code=404, detail="OD Request not found")

    # Authorization Check
    if current_user.system_role in ["SUPER_ADMIN", "ADMIN"]:
        return od_req

    if current_user.system_role == "STUDENT":
        if od_req.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own OD requests."
            )
        return od_req

    if current_user.system_role == "FACULTY":
        if od_req.mentor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view OD requests assigned to you as Class Mentor."
            )
        return od_req

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


@router.post("/{od_id}/approve", response_model=schemas.ODRequestResponse)
def approve_or_reject_od(
    od_id: int,
    approval_in: schemas.ODApprovalRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Rule: Student CANNOT approve OD
    if current_user.system_role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Students are not authorized to approve OD requests."
        )

    od_req = db.query(models.ODRequest).filter(models.ODRequest.id == od_id).first()
    if not od_req:
        raise HTTPException(status_code=404, detail="OD Request not found")

    # Rule: Only assigned mentor faculty or super admin/admin can approve
    if current_user.system_role == "FACULTY" and od_req.mentor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not the assigned Class Mentor for this student's OD request."
        )

    if approval_in.status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid OD approval status. Must be APPROVED or REJECTED.")

    od_req.status = approval_in.status
    if approval_in.mentor_remark:
        od_req.mentor_remark = approval_in.mentor_remark

    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        action=f"OD_{approval_in.status}",
        entity="od_requests",
        entity_id=od_req.id,
        new_value=f"OD request status set to {approval_in.status}"
    )
    db.add(audit)
    db.commit()
    db.refresh(od_req)
    return od_req
