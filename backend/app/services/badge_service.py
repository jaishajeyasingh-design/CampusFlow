from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app import models

NON_QUALIFYING_CATEGORIES = {"recreation", "sports", "casual", "gaming"}

def is_qualifying_category(category: str | None) -> bool:
    if not category:
        return True
    cat_lower = category.strip().lower()
    if cat_lower in NON_QUALIFYING_CATEGORIES:
        return False
    return True


def evaluate_and_award_badges(db: Session, student_id: int) -> List[models.StudentBadge]:
    """
    Evaluates a student's eligibility for badges based on actual database records
    and awards any qualifying badges that have not yet been awarded.
    Idempotent and thread-safe via DB unique constraints.
    """
    user = db.query(models.User).filter(models.User.id == student_id).first()
    if not user:
        return []

    newly_awarded = []

    # Get student's existing awarded badge IDs
    existing_student_badges = db.query(models.StudentBadge).filter(
        models.StudentBadge.student_id == student_id
    ).all()
    awarded_badge_ids = {sb.badge_id for sb in existing_student_badges}

    # Fetch all badge definitions
    all_badges = db.query(models.Badge).all()
    badges_by_name = {b.name: b for b in all_badges}

    # 1. CODE WARRIOR BADGE EVALUATION
    code_warrior_badge = badges_by_name.get("Code Warrior")
    if code_warrior_badge and code_warrior_badge.id not in awarded_badge_ids:
        # Check actual attendance records (not just registrations)
        attendances = db.query(models.Attendance).filter(
            models.Attendance.student_id == student_id
        ).all()

        # Count distinct events attended
        attended_event_ids = {a.event_id for a in attendances}
        if attended_event_ids:
            events = db.query(models.Event).filter(
                models.Event.id.in_(attended_event_ids)
            ).all()

            qualifying_event_ids = {
                e.id for e in events if is_qualifying_category(e.category)
            }

            if len(qualifying_event_ids) >= 3:
                sb = models.StudentBadge(
                    student_id=student_id,
                    badge_id=code_warrior_badge.id
                )
                db.add(sb)
                newly_awarded.append(sb)

    # 2. CLUB LEADER BADGE EVALUATION
    club_leader_badge = badges_by_name.get("Club Leader")
    if club_leader_badge and club_leader_badge.id not in awarded_badge_ids:
        # Check actual club member dynamic role assignments
        memberships = db.query(models.ClubMember).filter(
            models.ClubMember.user_id == student_id,
            models.ClubMember.status == "ACTIVE"
        ).all()

        has_leadership_role = False
        for m in memberships:
            if m.dynamic_role_id is not None:
                has_leadership_role = True
                break
            if m.role_name and m.role_name.strip().upper() not in ["MEMBER", "STUDENT", ""]:
                has_leadership_role = True
                break

        if has_leadership_role:
            sb = models.StudentBadge(
                student_id=student_id,
                badge_id=club_leader_badge.id
            )
            db.add(sb)
            newly_awarded.append(sb)

    if newly_awarded:
        try:
            db.commit()
            from app.services import notification_service
            for sb in newly_awarded:
                db.refresh(sb)
                badge_name = sb.badge.name if sb.badge else "New Badge"
                notification_service.create_notification(
                    db,
                    user_id=student_id,
                    title="New Badge Awarded!",
                    message=f"Congratulations! You earned the '{badge_name}' badge.",
                    type="BADGE_AWARDED",
                    entity_type="BADGE",
                    entity_id=sb.badge_id,
                    prevent_duplicates=True
                )
        except IntegrityError:
            db.rollback()
            newly_awarded = []


    return newly_awarded


def get_student_badges(db: Session, student_id: int) -> List[models.StudentBadge]:
    """
    Evaluates eligibility and returns all badges awarded to the given student.
    """
    evaluate_and_award_badges(db, student_id)
    return db.query(models.StudentBadge).filter(
        models.StudentBadge.student_id == student_id
    ).all()


def get_all_badges(db: Session) -> List[models.Badge]:
    """
    Returns all available badge definitions.
    """
    return db.query(models.Badge).all()
