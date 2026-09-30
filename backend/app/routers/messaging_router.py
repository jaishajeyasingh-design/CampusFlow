from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import messaging_service

router = APIRouter(prefix="/api/messages", tags=["Messaging"])


@router.post("", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    msg_in: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Sends a contextual message (EVENT or OD_REQUEST) between authorized participants.
    """
    return messaging_service.send_message(
        db=db,
        sender=current_user,
        recipient_id=msg_in.recipient_id,
        context_type=msg_in.context_type,
        context_id=msg_in.context_id,
        message_text=msg_in.message,
    )


@router.get("", response_model=List[schemas.MessageResponse])
def get_messages(
    context_type: Optional[str] = Query(None, description="Filter by context type (EVENT or OD_REQUEST)"),
    context_id: Optional[int] = Query(None, description="Filter by context ID"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Returns messages involving the current user, optionally filtered by context.
    """
    return messaging_service.get_user_messages(
        db=db,
        user=current_user,
        context_type=context_type,
        context_id=context_id,
    )


@router.get("/unread-count", response_model=schemas.UnreadMessageCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Returns unread message count for the authenticated user.
    """
    count = messaging_service.get_unread_count(db=db, user=current_user)
    return schemas.UnreadMessageCountResponse(unread_count=count)


@router.get("/context/{context_type}/{context_id}", response_model=List[schemas.MessageResponse])
def get_context_messages(
    context_type: str,
    context_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Returns all messages for a specific context thread belonging to authorized user.
    """
    return messaging_service.get_context_messages(
        db=db,
        user=current_user,
        context_type=context_type,
        context_id=context_id,
    )


@router.patch("/read-all", response_model=dict)
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Marks all unread messages for the current user as read.
    """
    count = messaging_service.mark_all_read(db=db, user=current_user)
    return {"message": "All unread messages marked as read.", "updated_count": count}


@router.patch("/{message_id}/read", response_model=schemas.MessageResponse)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """
    Marks a single message as read (recipient only).
    """
    return messaging_service.mark_message_read(db=db, user=current_user, message_id=message_id)
