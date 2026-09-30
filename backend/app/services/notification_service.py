from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app import models


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    link: Optional[str] = None,
    prevent_duplicates: bool = True
) -> Optional[models.Notification]:
    """
    Creates and persists a notification for a specific recipient user.
    Prevents duplicate notifications for the same user, type, entity_type, and entity_id if prevent_duplicates is True.
    """
    if prevent_duplicates and type and entity_type and entity_id:
        existing = db.query(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.type == type,
            models.Notification.entity_type == entity_type,
            models.Notification.entity_id == entity_id
        ).first()
        if existing:
            return existing

    notif = models.Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        link=link,
        is_read=False,
        created_at=datetime.utcnow()
    )

    db.add(notif)
    try:
        db.commit()
        db.refresh(notif)
        return notif
    except IntegrityError:
        db.rollback()
        return None


def get_user_notifications(db: Session, user_id: int) -> List[models.Notification]:
    """
    Returns all notifications belonging to the authenticated user ordered by created_at desc.
    """
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id
    ).order_by(models.Notification.created_at.desc()).all()


def get_unread_count(db: Session, user_id: int) -> int:
    """
    Returns unread notification count for the authenticated user.
    """
    return db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).count()


def mark_as_read(db: Session, notification_id: int, user_id: int) -> Optional[models.Notification]:
    """
    Marks a single notification as read if it belongs to the authenticated user.
    Returns None if notification is not found or belongs to another user.
    """
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id
    ).first()

    if not notif:
        return None

    if notif.user_id != user_id:
        # User ownership mismatch
        return None

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_as_read(db: Session, user_id: int) -> int:
    """
    Marks all notifications belonging to the authenticated user as read.
    """
    updated_count = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return updated_count


def notify_role_assigned(db: Session, user_id: int, role_name: str, club_name: str, member_id: int) -> Optional[models.Notification]:
    """
    Triggers a ROLE_ASSIGNED notification for a user when assigned a dynamic club role.
    """
    return create_notification(
        db,
        user_id=user_id,
        title="Club Role Assigned",
        message=f"You have been assigned the role '{role_name}' in {club_name}.",
        type="ROLE_ASSIGNED",
        entity_type="CLUB_MEMBER",
        entity_id=member_id,
        prevent_duplicates=True
    )

