from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import badge_service

router = APIRouter(prefix="/api/badges", tags=["Badge System"])


@router.get("", response_model=List[schemas.BadgeResponse])
def list_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns all available badge definitions in CampusFlow.
    Requires authentication.
    """
    return badge_service.get_all_badges(db)


@router.get("/my", response_model=List[schemas.StudentBadgeResponse])
def get_my_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("STUDENT"))
):
    """
    Returns badges awarded to the currently authenticated student.
    Evaluates badge eligibility dynamically and awards qualifying badges automatically.
    """
    student_badges = badge_service.get_student_badges(db, current_user.id)
    result = []
    for sb in student_badges:
        badge = sb.badge
        result.append({
            "id": badge.id if badge else sb.badge_id,
            "badge_id": sb.badge_id,
            "name": badge.name if badge else "",
            "description": badge.description if badge else "",
            "icon": badge.icon if badge else "",
            "criteria": badge.criteria if badge else "",
            "awarded_at": sb.awarded_at
        })
    return result
