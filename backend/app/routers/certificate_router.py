from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import certificate_service

router = APIRouter(prefix="/api/certificates", tags=["Certificate System"])


@router.get("/my", response_model=List[schemas.CertificateResponse])
def get_my_certificates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.require_role("STUDENT"))
):
    """
    Returns all certificates belonging to the currently authenticated student.
    Uses JWT authenticated user identity (student_id is never taken from client).
    """
    certs = certificate_service.get_student_certificates(db, current_user.id)
    result = []
    for c in certs:
        result.append({
            "id": c.id,
            "event_id": c.event_id,
            "student_id": c.student_id,
            "certificate_number": c.certificate_number,
            "verification_code": c.verification_code,
            "event_title": c.event.title if c.event else None,
            "event_date": c.event.start_time if c.event else None,
            "issue_date": c.issue_date,
            "pdf_url": f"/api/certificates/{c.certificate_number}/pdf"
        })
    return result


@router.get("/verify/{identifier}", response_model=schemas.CertificateVerifyResponse)
def verify_certificate_endpoint(
    identifier: str,
    db: Session = Depends(get_db)
):
    """
    Public verification endpoint to verify certificate authenticity.
    Returns safe verification information without exposing sensitive credentials or user data.
    """
    details = certificate_service.verify_certificate(db, identifier)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found or invalid verification code."
        )
    return details


@router.get("/{identifier}/pdf")
def download_certificate_pdf(
    identifier: str,
    db: Session = Depends(get_db)
):
    """
    Generates and returns the PDF document for a valid certificate.
    Includes embedded QR verification code pointing to the verification endpoint.
    """
    query = db.query(models.Certificate)
    if identifier.isdigit():
        cert = query.filter((models.Certificate.id == int(identifier)) | 
                            (models.Certificate.certificate_number == identifier) | 
                            (models.Certificate.verification_code == identifier)).first()
    else:
        cert = query.filter((models.Certificate.certificate_number == identifier) | 
                            (models.Certificate.verification_code == identifier)).first()

    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate not found."
        )

    pdf_bytes = certificate_service.generate_pdf_certificate(cert)
    filename = f"certificate_{cert.certificate_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )
