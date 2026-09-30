from typing import List, Optional
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app import models, schemas
from app.services import notification_service


def is_user_authorized_for_context(db: Session, user: models.User, context_type: str, context_id: int) -> bool:
    """
    Centralized authorization logic determining if a user is an authorized participant
    for a given context (EVENT or OD_REQUEST).
    Students are strictly disallowed.
    """
    if not user or user.system_role == "STUDENT":
        return False

    if context_type == "EVENT":
        event = db.query(models.Event).filter(models.Event.id == context_id).first()
        if not event:
            return False

        if user.system_role in ["SUPER_ADMIN", "ADMIN"]:
            return True

        if event.created_by_id == user.id:
            return True

        if event.club:
            if event.club.faculty_coordinator_id == user.id:
                return True
            if event.club.club_admin_id == user.id:
                return True

            # Check dynamic role or active leadership membership in club
            member = db.query(models.ClubMember).filter(
                models.ClubMember.club_id == event.club_id,
                models.ClubMember.user_id == user.id,
                models.ClubMember.status == "ACTIVE"
            ).first()
            if member and (member.role_name in ["President", "Vice President", "Lead", "ADMIN"] or user.system_role == "CLUB_ADMIN"):
                return True

        return False

    elif context_type == "OD_REQUEST":
        od = db.query(models.ODRequest).filter(models.ODRequest.id == context_id).first()
        if not od:
            return False

        if user.system_role in ["SUPER_ADMIN", "ADMIN"]:
            return True

        if od.mentor_id == user.id:
            return True

        if od.event:
            if od.event.created_by_id == user.id:
                return True
            if od.event.club:
                if od.event.club.faculty_coordinator_id == user.id:
                    return True
                if od.event.club.club_admin_id == user.id:
                    return True

        return False

    return False


def send_message(
    db: Session,
    sender: models.User,
    recipient_id: int,
    context_type: str,
    context_id: int,
    message_text: str
) -> models.Message:
    """
    Validates authorization, context existence, and participant eligibility before sending a message.
    Triggers a recipient notification on success.
    """
    if sender.system_role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Students are not authorized to send contextual messages."
        )

    if context_type not in ["EVENT", "OD_REQUEST"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid context_type. Must be EVENT or OD_REQUEST."
        )

    clean_msg = message_text.strip() if message_text else ""
    if not clean_msg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message body cannot be empty."
        )

    if len(clean_msg) > 2000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message exceeds maximum allowed length of 2000 characters."
        )

    # Context existence check
    if context_type == "EVENT":
        ctx_obj = db.query(models.Event).filter(models.Event.id == context_id).first()
        if not ctx_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Event context not found."
            )
    else:
        ctx_obj = db.query(models.ODRequest).filter(models.ODRequest.id == context_id).first()
        if not ctx_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OD Request context not found."
            )

    # Recipient validation
    recipient = db.query(models.User).filter(models.User.id == recipient_id).first()
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found."
        )

    if recipient.system_role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Messaging students is not permitted."
        )

    if sender.id == recipient.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send a message to yourself."
        )

    # Participant authorization validation
    if not is_user_authorized_for_context(db, sender, context_type, context_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sender is not an authorized participant for this context."
        )

    if not is_user_authorized_for_context(db, recipient, context_type, context_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recipient is not an authorized participant for this context."
        )

    msg = models.Message(
        sender_id=sender.id,
        recipient_id=recipient.id,
        context_type=context_type,
        context_id=context_id,
        message=clean_msg,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Trigger Notification for Recipient
    notification_service.create_notification(
        db=db,
        user_id=recipient.id,
        title=f"New message regarding {context_type} #{context_id}",
        message=f"You received a new message from {sender.full_name}.",
        type="MESSAGE_RECEIVED",
        entity_type=context_type,
        entity_id=context_id,
        prevent_duplicates=False
    )

    return msg


def get_user_messages(
    db: Session,
    user: models.User,
    context_type: Optional[str] = None,
    context_id: Optional[int] = None
) -> List[models.Message]:
    """
    Returns messages where the authenticated user is sender or recipient.
    Optional context filters are strictly authorization-checked.
    """
    if user.system_role == "STUDENT":
        return []

    q = db.query(models.Message).filter(
        or_(models.Message.sender_id == user.id, models.Message.recipient_id == user.id)
    )

    if context_type or context_id:
        if not context_type or not context_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both context_type and context_id must be provided for filtering."
            )

        if context_type not in ["EVENT", "OD_REQUEST"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid context_type. Must be EVENT or OD_REQUEST."
            )

        if context_type == "EVENT":
            ctx_obj = db.query(models.Event).filter(models.Event.id == context_id).first()
            if not ctx_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event context not found.")
        else:
            ctx_obj = db.query(models.ODRequest).filter(models.ODRequest.id == context_id).first()
            if not ctx_obj:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OD Request context not found.")

        if not is_user_authorized_for_context(db, user, context_type, context_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this context."
            )

        q = q.filter(
            models.Message.context_type == context_type,
            models.Message.context_id == context_id
        )

    return q.order_by(models.Message.created_at.desc()).all()


def get_context_messages(
    db: Session,
    user: models.User,
    context_type: str,
    context_id: int
) -> List[models.Message]:
    """
    Returns messages specifically for a given context (EVENT or OD_REQUEST).
    Strictly verifies user authorization for that context.
    """
    if user.system_role == "STUDENT":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    if context_type not in ["EVENT", "OD_REQUEST"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid context_type. Must be EVENT or OD_REQUEST."
        )

    if context_type == "EVENT":
        ctx_obj = db.query(models.Event).filter(models.Event.id == context_id).first()
        if not ctx_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event context not found.")
    else:
        ctx_obj = db.query(models.ODRequest).filter(models.ODRequest.id == context_id).first()
        if not ctx_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="OD Request context not found.")

    if not is_user_authorized_for_context(db, user, context_type, context_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this context."
        )

    return db.query(models.Message).filter(
        models.Message.context_type == context_type,
        models.Message.context_id == context_id,
        or_(models.Message.sender_id == user.id, models.Message.recipient_id == user.id)
    ).order_by(models.Message.created_at.asc()).all()


def mark_message_read(db: Session, user: models.User, message_id: int) -> models.Message:
    """
    Marks a single message as read. Only the recipient can mark a message as read.
    """
    msg = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found."
        )

    if msg.recipient_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only the recipient can mark this message as read."
        )

    msg.is_read = True
    db.commit()
    db.refresh(msg)
    return msg


def mark_all_read(db: Session, user: models.User) -> int:
    """
    Marks all unread messages addressed to the current user as read.
    """
    unread_msgs = db.query(models.Message).filter(
        models.Message.recipient_id == user.id,
        models.Message.is_read == False
    ).all()

    for msg in unread_msgs:
        msg.is_read = True

    db.commit()
    return len(unread_msgs)


def get_unread_count(db: Session, user: models.User) -> int:
    """
    Returns unread message count where recipient_id == current_user.id.
    """
    if user.system_role == "STUDENT":
        return 0

    return db.query(models.Message).filter(
        models.Message.recipient_id == user.id,
        models.Message.is_read == False
    ).count()
