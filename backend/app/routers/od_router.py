from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth

router = APIRouter(prefix="/api/od-requests", tags=["OD Management"])


@router.get("/{od_id}", response_model=schemas.ODRequestResponse)
def get_od_request_by_id(
    od_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    od_req = db.query(models.ODRequest).filter(models.ODRequest.id == od_id).first()
    if not od_req:
        raise HTTPException(status_code=404, detail="OD Request not found")

    # Authorization Check
    if current_user.system_role in ["SUPER_ADMIN", "ADMIN"]:
        return od_req

    if current_user.system_role == "STUDENT":
        if od_req.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view your own OD requests."
            )
        return od_req

    if current_user.system_role == "FACULTY":
        if od_req.mentor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view OD requests assigned to you as Class Mentor."
            )
        return od_req

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")


@router.post("/{od_id}/approve", response_model=schemas.ODRequestResponse)
def approve_or_reject_od(
    od_id: int,
    approval_in: schemas.ODApprovalRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # Rule: Student CANNOT approve OD
    if current_user.system_role == "STUDENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Students are not authorized to approve OD requests."
        )

    od_req = db.query(models.ODRequest).filter(models.ODRequest.id == od_id).first()
    if not od_req:
        raise HTTPException(status_code=404, detail="OD Request not found")

    # Rule: Only assigned mentor faculty or super admin/admin can approve
    if current_user.system_role == "FACULTY" and od_req.mentor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: You are not the assigned Class Mentor for this student's OD request."
        )

    if approval_in.status not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Invalid OD approval status. Must be APPROVED or REJECTED.")

    od_req.status = approval_in.status
    if approval_in.mentor_remark:
        od_req.mentor_remark = approval_in.mentor_remark

    # Audit log
    audit = models.AuditLog(
        user_id=current_user.id,
        action=f"OD_{approval_in.status}",
        entity="od_requests",
        entity_id=od_req.id,
        new_value=f"OD request status set to {approval_in.status}"
    )
    db.add(audit)
    db.commit()
    db.refresh(od_req)
    return od_req
