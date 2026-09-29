from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/clubs", tags=["Club Management"])


@router.get("", response_model=List[schemas.ClubResponse])
def list_clubs(db: Session = Depends(get_db)):
    return db.query(models.Club).all()


@router.get("/{club_id}", response_model=schemas.ClubResponse)
def get_club(club_id: int, db: Session = Depends(get_db)):
    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


@router.put("/{club_id}/manage", response_model=schemas.ClubResponse)
def manage_club(
    club_id: int,
    club_in: schemas.ClubUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Enforce club access authorization
    auth.require_club_access(club_id, current_user, db)

    club = db.query(models.Club).filter(models.Club.id == club_id).first()
    if not club:
        raise HTTPException(status_code=404, detail="Club not found")

    if club_in.name:
        club.name = club_in.name
    if club_in.description:
        club.description = club_in.description
    if club_in.category:
        club.category = club_in.category
    if club_in.logo_url:
        club.logo_url = club_in.logo_url
    if club_in.banner_url:
        club.banner_url = club_in.banner_url

    audit = models.AuditLog(
        user_id=current_user.id,
        action="CLUB_UPDATED",
        entity="clubs",
        entity_id=club.id,
        new_value=f"Updated details for club {club.name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(club)
    return club
