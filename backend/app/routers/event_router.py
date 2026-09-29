from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/events", tags=["Event Management"])

# Valid state transitions lookup map
VALID_TRANSITIONS = {
    "DRAFT": {"PENDING_FACULTY_APPROVAL"},
    "PENDING_FACULTY_APPROVAL": {"APPROVED", "REJECTED"},
    "REJECTED": {"PENDING_FACULTY_APPROVAL"},
    "APPROVED": {"ONGOING", "CANCELLED"},
    "ONGOING": {"COMPLETED", "CANCELLED"},
    "COMPLETED": set(),
    "CANCELLED": set()
}


def validate_state_transition(current_status: str, target_status: str):
    allowed = VALID_TRANSITIONS.get(current_status, set())
    if target_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event status transition from '{current_status}' to '{target_status}'."
        )


@router.get("", response_model=List[schemas.EventResponse])
def list_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Students only see APPROVED events
    if current_user.system_role == "STUDENT":
        return db.query(models.Event).filter(models.Event.status == "APPROVED").all()

    return db.query(models.Event).all()


@router.get("/my", response_model=List[schemas.EventRegistrationResponse])
def get_my_event_registrations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("STUDENT"))
):
    registrations = db.query(models.EventRegistration).filter(
        models.EventRegistration.student_id == current_user.id
    ).all()
    return registrations


@router.get("/{event_id}", response_model=schemas.EventResponse)
def get_event_detail(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.system_role == "STUDENT" and event.status != "APPROVED":
        raise HTTPException(status_code=404, detail="Event not found")

    return event


@router.post("", response_model=schemas.EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    event_in: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Rule: Check permission or role
    if current_user.system_role not in ["SUPER_ADMIN", "ADMIN", "CLUB_ADMIN"]:
        if not auth.require_permission("create_events", event_in.club_id, current_user, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not have permission to create events for this club."
            )
    else:
        auth.require_club_access(event_in.club_id, current_user, db)

    if not event_in.title or not event_in.title.strip():
        raise HTTPException(status_code=400, detail="Event title is required.")
    if not event_in.venue or not event_in.venue.strip():
        raise HTTPException(status_code=400, detail="Event venue is required.")
    if event_in.capacity <= 0:
        raise HTTPException(status_code=400, detail="Event capacity must be greater than zero.")
    if event_in.start_time >= event_in.end_time:
        raise HTTPException(status_code=400, detail="start_time must be strictly before end_time.")

    # Newly created event MUST start as DRAFT
    new_event = models.Event(
        club_id=event_in.club_id,
        title=event_in.title.strip(),
        description=event_in.description,
        category=event_in.category,
        venue=event_in.venue.strip(),
        start_time=event_in.start_time,
        end_time=event_in.end_time,
        capacity=event_in.capacity,
        status="DRAFT",
        created_by_id=current_user.id
    )
    db.add(new_event)
    db.flush()

    audit = models.AuditLog(
        user_id=current_user.id,
        action="EVENT_CREATED",
        entity="events",
        entity_id=new_event.id,
        new_value=f"Created event '{new_event.title}' with status DRAFT"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_event)
    return new_event


@router.post("/{event_id}/submit", response_model=schemas.EventResponse)
def submit_event_for_approval(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    auth.require_club_access(event.club_id, current_user, db)
    validate_state_transition(event.status, "PENDING_FACULTY_APPROVAL")

    if not event.title or not event.venue or event.capacity <= 0 or event.start_time >= event.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit event: Missing or invalid required event information."
        )

    event.status = "PENDING_FACULTY_APPROVAL"
    audit = models.AuditLog(
        user_id=current_user.id,
        action="EVENT_SUBMITTED",
        entity="events",
        entity_id=event.id,
        new_value="Submitted event for faculty approval"
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/approve", response_model=schemas.EventResponse)
def approve_or_reject_event(
    event_id: int,
    approval_in: Optional[schemas.EventApprovalRequest] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if approval_in is None:
        approval_in = schemas.EventApprovalRequest(status="APPROVED")

    target_status = approval_in.status.upper() if approval_in.status else "APPROVED"

    # Rule: Student or Club Admin approving/rejecting event -> 403 Forbidden
    if current_user.system_role in ["STUDENT", "CLUB_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: System role '{current_user.system_role}' is not authorized to approve events. Club Admin cannot approve their own event."
        )

    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.system_role == "FACULTY":
        if event.club.faculty_coordinator_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not the assigned Faculty Coordinator for this club."
            )
    elif current_user.system_role not in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if target_status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Status must be APPROVED or REJECTED")

    # State transition check
    validate_state_transition(event.status, target_status)

    if target_status == "REJECTED":
        if not approval_in.faculty_remark or not approval_in.faculty_remark.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rejection reason is required when rejecting an event."
            )
        event.faculty_remark = approval_in.faculty_remark.strip()

    event.status = target_status
    if target_status == "APPROVED" and approval_in.faculty_remark:
        event.faculty_remark = approval_in.faculty_remark.strip()

    audit = models.AuditLog(
        user_id=current_user.id,
        action=f"EVENT_{target_status}",
        entity="events",
        entity_id=event.id,
        new_value=f"Event status set to {target_status}"
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/reject", response_model=schemas.EventResponse)
def reject_event(
    event_id: int,
    reject_in: schemas.EventRejectRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    approval_req = schemas.EventApprovalRequest(status="REJECTED", faculty_remark=reject_in.reason)
    return approve_or_reject_event(event_id=event_id, approval_in=approval_req, db=db, current_user=current_user)


@router.post("/{event_id}/resubmit", response_model=schemas.EventResponse)
def resubmit_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    auth.require_club_access(event.club_id, current_user, db)
    validate_state_transition(event.status, "PENDING_FACULTY_APPROVAL")

    event.status = "PENDING_FACULTY_APPROVAL"
    audit = models.AuditLog(
        user_id=current_user.id,
        action="EVENT_RESUBMITTED",
        entity="events",
        entity_id=event.id,
        new_value="Resubmitted event for faculty approval"
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/start", response_model=schemas.EventResponse)
def start_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    auth.require_club_access(event.club_id, current_user, db)
    validate_state_transition(event.status, "ONGOING")

    event.status = "ONGOING"
    audit = models.AuditLog(
        user_id=current_user.id,
        action="EVENT_STARTED",
        entity="events",
        entity_id=event.id,
        new_value="Event marked as ONGOING"
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/complete", response_model=schemas.EventResponse)
def complete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    auth.require_club_access(event.club_id, current_user, db)
    validate_state_transition(event.status, "COMPLETED")

    event.status = "COMPLETED"
    audit = models.AuditLog(
        user_id=current_user.id,
        action="EVENT_COMPLETED",
        entity="events",
        entity_id=event.id,
        new_value="Event marked as COMPLETED"
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/cancel", response_model=schemas.EventResponse)
def cancel_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Allow authorized club admin, admin, super admin or faculty coordinator
    if current_user.system_role == "FACULTY" and event.club.faculty_coordinator_id == current_user.id:
        pass
    else:
        auth.require_club_access(event.club_id, current_user, db)

    validate_state_transition(event.status, "CANCELLED")

    event.status = "CANCELLED"
    audit = models.AuditLog(
        user_id=current_user.id,
        action="EVENT_CANCELLED",
        entity="events",
        entity_id=event.id,
        new_value="Event marked as CANCELLED"
    )
    db.add(audit)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/register", status_code=status.HTTP_201_CREATED)
def register_student_for_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("STUDENT"))
):
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Rule: Students can register ONLY for APPROVED events
    if event.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot register for event with status '{event.status}'. Registration is allowed ONLY for APPROVED events."
        )

    # Prevent duplicate registration (HTTP 409 Conflict)
    existing_reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.student_id == current_user.id
    ).first()

    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Student is already registered for this event."
        )

    # Check capacity
    current_count = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.status == "REGISTERED"
    ).count()

    if current_count >= event.capacity:
        raise HTTPException(status_code=400, detail="Event registration capacity reached.")

    reg = models.EventRegistration(
        event_id=event_id,
        student_id=current_user.id,
        status="REGISTERED",
        qr_code=f"QR-EVT{event_id}-STD{current_user.id}"
    )
    db.add(reg)
    db.commit()
    return {"message": "Registration successful", "registration_id": reg.id, "qr_code": reg.qr_code}
