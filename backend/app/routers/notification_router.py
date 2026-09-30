from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import notification_service

router = APIRouter(prefix="/api/notifications", tags=["Notification System"])


@router.get("", response_model=List[schemas.NotificationResponse])
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns all notifications belonging strictly to the authenticated user.
    """
    return notification_service.get_user_notifications(db, current_user.id)


@router.get("/unread-count", response_model=schemas.UnreadCountResponse)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns the count of unread notifications for the authenticated user.
    """
    count = notification_service.get_unread_count(db, current_user.id)
    return {"unread_count": count}


@router.patch("/read-all")
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Marks all notifications belonging to the authenticated user as read.
    """
    updated_count = notification_service.mark_all_as_read(db, current_user.id)
    return {"message": "All notifications marked as read", "updated_count": updated_count}


@router.patch("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_single_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Marks a single notification as read.
    Enforces user ownership verification so users cannot mark another user's notifications as read.
    """
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found."
        )

    if notif.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You cannot modify another user's notification."
        )

    updated_notif = notification_service.mark_as_read(db, notification_id, current_user.id)
    return updated_notif
