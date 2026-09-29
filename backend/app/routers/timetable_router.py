from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/timetable", tags=["Timetable Management"])


def validate_periods(periods: List[schemas.TimetablePeriodCreate]):
    # Enforce start_time < end_time validation
    for p in periods:
        try:
            start_t = datetime.strptime(p.start_time, "%H:%M").time()
            end_t = datetime.strptime(p.end_time, "%H:%M").time()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time format for period {p.period_number}. Expected HH:MM format."
            )

        if start_t >= end_t:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid period timing: start_time ({p.start_time}) must be strictly before end_time ({p.end_time})"
            )

    # Compare every period against every other period for overlap
    n = len(periods)
    for i in range(n):
        for j in range(i + 1, n):
            p1 = periods[i]
            p2 = periods[j]
            t1_start = datetime.strptime(p1.start_time, "%H:%M").time()
            t1_end = datetime.strptime(p1.end_time, "%H:%M").time()
            t2_start = datetime.strptime(p2.start_time, "%H:%M").time()
            t2_end = datetime.strptime(p2.end_time, "%H:%M").time()

            if t1_start < t2_end and t2_start < t1_end:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Timetable periods overlap: Period {p1.period_number} ({p1.start_time}-{p1.end_time}) overlaps with Period {p2.period_number} ({p2.start_time}-{p2.end_time})"
                )


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
    validate_periods(structure_in.periods)

    new_structure = models.TimetableStructure(
        name=structure_in.name,
        working_days=structure_in.working_days,
        effective_from=structure_in.effective_from,
        is_active=structure_in.is_active,
        created_by_id=current_user.id
    )
    db.add(new_structure)
    db.flush()

    # Preserve chronological ordering
    sorted_periods = sorted(structure_in.periods, key=lambda p: datetime.strptime(p.start_time, "%H:%M").time())
    for p in sorted_periods:
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

    validate_periods(structure_in.periods)

    structure.name = structure_in.name
    structure.working_days = structure_in.working_days
    structure.effective_from = structure_in.effective_from
    structure.is_active = structure_in.is_active

    # Clear existing periods & add updated, preserving chronological ordering
    db.query(models.TimetablePeriod).filter(models.TimetablePeriod.timetable_structure_id == structure.id).delete()

    sorted_periods = sorted(structure_in.periods, key=lambda p: datetime.strptime(p.start_time, "%H:%M").time())
    for p in sorted_periods:
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

