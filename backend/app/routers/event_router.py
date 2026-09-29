from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/events", tags=["Event Management"])


@router.get("", response_model=List[schemas.EventResponse])
def list_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Students only see APPROVED events
    if current_user.system_role == "STUDENT":
        return db.query(models.Event).filter(models.Event.status == "APPROVED").all()

    return db.query(models.Event).all()


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

    new_event = models.Event(
        club_id=event_in.club_id,
        title=event_in.title,
        description=event_in.description,
        category=event_in.category,
        venue=event_in.venue,
        start_time=event_in.start_time,
        end_time=event_in.end_time,
        capacity=event_in.capacity,
        status="DRAFT",
        created_by_id=current_user.id
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


@router.post("/{event_id}/approve", response_model=schemas.EventResponse)
def approve_or_reject_event(
    event_id: int,
    approval_in: schemas.EventApprovalRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Rule: Student or Club Admin approving event -> 403 Forbidden
    if current_user.system_role in ["STUDENT", "CLUB_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: System role '{current_user.system_role}' is not authorized to approve events. Club Admin cannot approve their own event."
        )

    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    if current_user.system_role == "FACULTY" and event.club.faculty_coordinator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not the assigned Faculty Coordinator for this club."
        )

    if approval_in.status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Status must be APPROVED or REJECTED")

    event.status = approval_in.status
    if approval_in.faculty_remark:
        event.faculty_remark = approval_in.faculty_remark

    audit = models.AuditLog(
        user_id=current_user.id,
        action=f"EVENT_{approval_in.status}",
        entity="events",
        entity_id=event.id,
        new_value=f"Event status set to {approval_in.status}"
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

    # Check capacity
    current_count = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.status == "REGISTERED"
    ).count()

    if current_count >= event.capacity:
        raise HTTPException(status_code=400, detail="Event registration capacity reached.")

    # Prevent duplicate registration
    existing_reg = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.student_id == current_user.id
    ).first()

    if existing_reg:
        raise HTTPException(status_code=400, detail="Student is already registered for this event.")

    reg = models.EventRegistration(
        event_id=event_id,
        student_id=current_user.id,
        status="REGISTERED",
        qr_code=f"QR-EVT{event_id}-STD{current_user.id}"
    )
    db.add(reg)
    db.commit()
    return {"message": "Registration successful", "registration_id": reg.id, "qr_code": reg.qr_code}
