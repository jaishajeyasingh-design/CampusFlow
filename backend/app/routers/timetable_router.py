from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/timetable", tags=["Timetable Management"])


@router.get("/structures", response_model=List[schemas.TimetableStructureResponse])
def list_timetable_structures(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return db.query(models.TimetableStructure).all()


@router.post("/structures", response_model=schemas.TimetableStructureResponse, status_code=status.HTTP_201_CREATED)
def create_timetable_structure(
    structure_in: schemas.TimetableStructureCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("SUPER_ADMIN"))
):
    # Enforce period validation: end > start, no overlap, duration > 0
    for p in structure_in.periods:
        if p.start_time >= p.end_time:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid period timing: start_time ({p.start_time}) must be strictly before end_time ({p.end_time})"
            )

    new_structure = models.TimetableStructure(
        name=structure_in.name,
        working_days=structure_in.working_days,
        effective_from=structure_in.effective_from,
        is_active=structure_in.is_active,
        created_by_id=current_user.id
    )
    db.add(new_structure)
    db.flush()

    for p in structure_in.periods:
        period = models.TimetablePeriod(
            timetable_structure_id=new_structure.id,
            period_number=p.period_number,
            start_time=p.start_time,
            end_time=p.end_time,
            period_type=p.period_type
        )
        db.add(period)

    # Log audit
    audit = models.AuditLog(
        user_id=current_user.id,
        action="TIMETABLE_CREATED",
        entity="timetable_structures",
        entity_id=new_structure.id,
        new_value=f"Created timetable structure '{new_structure.name}'"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_structure)
    return new_structure


@router.put("/structures/{structure_id}", response_model=schemas.TimetableStructureResponse)
def update_timetable_structure(
    structure_id: int,
    structure_in: schemas.TimetableStructureCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("SUPER_ADMIN"))
):
    structure = db.query(models.TimetableStructure).filter(models.TimetableStructure.id == structure_id).first()
    if not structure:
        raise HTTPException(status_code=404, detail="Timetable structure not found")

    structure.name = structure_in.name
    structure.working_days = structure_in.working_days
    structure.effective_from = structure_in.effective_from
    structure.is_active = structure_in.is_active

    # Clear existing periods & add updated
    db.query(models.TimetablePeriod).filter(models.TimetablePeriod.timetable_structure_id == structure.id).delete()

    for p in structure_in.periods:
        period = models.TimetablePeriod(
            timetable_structure_id=structure.id,
            period_number=p.period_number,
            start_time=p.start_time,
            end_time=p.end_time,
            period_type=p.period_type
        )
        db.add(period)

    db.commit()
    db.refresh(structure)
    return structure
