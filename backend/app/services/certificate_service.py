import io
import uuid
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import qrcode
from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader

from app import models


def generate_certificate_for_student(db: Session, event_id: int, student_id: int) -> Optional[models.Certificate]:
    """
    Generates a certificate for a student for a specific completed event.
    Requirements:
    1. Event must exist and have status 'COMPLETED'.
    2. Student must be registered for the event.
    3. Student must have an actual Attendance record for the event.
    4. Student must not already have a certificate for the event (idempotent).
    """
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event or event.status != "COMPLETED":
        return None

    registration = db.query(models.EventRegistration).filter(
        models.EventRegistration.event_id == event_id,
        models.EventRegistration.student_id == student_id
    ).first()
    if not registration:
        return None

    attendance = db.query(models.Attendance).filter(
        models.Attendance.event_id == event_id,
        models.Attendance.student_id == student_id
    ).first()
    if not attendance:
        return None

    # Check for existing certificate
    existing = db.query(models.Certificate).filter(
        models.Certificate.event_id == event_id,
        models.Certificate.student_id == student_id
    ).first()
    if existing:
        return existing

    # Generate unguessable certificate number and verification code
    cert_number = f"CF-CERT-{event_id}-{student_id}-{uuid.uuid4().hex[:8].upper()}"
    verify_code = f"VER-{uuid.uuid4().hex[:12].upper()}"

    cert = models.Certificate(
        event_id=event_id,
        student_id=student_id,
        certificate_number=cert_number,
        verification_code=verify_code,
        issue_date=datetime.utcnow()
    )

    db.add(cert)
    try:
        db.commit()
        db.refresh(cert)

        # Trigger notification to student
        from app.services import notification_service
        event_title = cert.event.title if cert.event else "Campus Event"
        notification_service.create_notification(
            db,
            user_id=student_id,
            title="Certificate Generated",
            message=f"Your certificate for '{event_title}' is now available.",
            type="CERTIFICATE_GENERATED",
            entity_type="CERTIFICATE",
            entity_id=cert.id,
            prevent_duplicates=True
        )

        return cert
    except IntegrityError:
        db.rollback()
        return db.query(models.Certificate).filter(
            models.Certificate.event_id == event_id,
            models.Certificate.student_id == student_id
        ).first()



def generate_certificates_for_event(db: Session, event_id: int) -> List[models.Certificate]:
    """
    Generates certificates for all registered students who have an Attendance record
    for a completed event.
    """
    event = db.query(models.Event).filter(models.Event.id == event_id).first()
    if not event or event.status != "COMPLETED":
        return []

    # Get student IDs who are registered AND have actual attendance records
    attendances = db.query(models.Attendance).filter(
        models.Attendance.event_id == event_id
    ).all()

    created_certificates = []
    for att in attendances:
        cert = generate_certificate_for_student(db, event_id, att.student_id)
        if cert:
            created_certificates.append(cert)

    return created_certificates


def get_student_certificates(db: Session, student_id: int) -> List[models.Certificate]:
    """
    Returns all certificates awarded to the student.
    """
    return db.query(models.Certificate).filter(
        models.Certificate.student_id == student_id
    ).all()


def verify_certificate(db: Session, identifier: str) -> Optional[dict]:
    """
    Verifies a certificate by certificate_number, verification_code, or numeric ID.
    Returns safe verification details without exposing sensitive user or system data.
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
        return None

    return {
        "certificate_number": cert.certificate_number,
        "verification_code": cert.verification_code,
        "student_name": cert.student.full_name if cert.student else "Student",
        "event_title": cert.event.title if cert.event else "Campus Event",
        "event_date": cert.event.start_time if cert.event else None,
        "issue_date": cert.issue_date,
        "certificate_type": "Certificate of Participation",
        "status": "VALID"
    }


def generate_pdf_certificate(cert: models.Certificate) -> bytes:
    """
    Generates a PDF certificate document with embedded QR verification code using ReportLab.
    """
    buffer = io.BytesIO()
    page_width, page_height = landscape(letter)
    c = canvas.Canvas(buffer, pagesize=landscape(letter))

    # Outer decorative border
    c.setStrokeColor(colors.HexColor("#1A365D"))
    c.setLineWidth(5)
    c.rect(20, 20, page_width - 40, page_height - 40)

    # Inner subtle border
    c.setStrokeColor(colors.HexColor("#2B6CB0"))
    c.setLineWidth(1)
    c.rect(25, 25, page_width - 50, page_height - 50)

    # Header Title
    c.setFont("Helvetica-Bold", 30)
    c.setFillColor(colors.HexColor("#1A365D"))
    c.drawCentredString(page_width / 2.0, page_height - 90, "CAMPUSFLOW")

    c.setFont("Helvetica", 16)
    c.setFillColor(colors.HexColor("#4A5568"))
    c.drawCentredString(page_width / 2.0, page_height - 125, "CERTIFICATE OF PARTICIPATION")

    c.setFont("Helvetica-Oblique", 13)
    c.drawCentredString(page_width / 2.0, page_height - 165, "This certificate is proudly presented to")

    # Student Name
    student_name = cert.student.full_name if cert.student else "Student"
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(colors.HexColor("#2B6CB0"))
    c.drawCentredString(page_width / 2.0, page_height - 210, student_name)

    c.setFont("Helvetica", 13)
    c.setFillColor(colors.HexColor("#4A5568"))
    c.drawCentredString(page_width / 2.0, page_height - 250, "for active participation and attendance in")

    # Event Title
    event_title = cert.event.title if cert.event else "Campus Event"
    c.setFont("Helvetica-Bold", 18)
    c.setFillColor(colors.HexColor("#1A365D"))
    c.drawCentredString(page_width / 2.0, page_height - 290, event_title)

    # Dates & Metadata
    event_date_str = cert.event.start_time.strftime("%B %d, %Y") if cert.event and cert.event.start_time else "N/A"
    issue_date_str = cert.issue_date.strftime("%B %d, %Y") if cert.issue_date else "N/A"

    c.setFont("Helvetica", 11)
    c.setFillColor(colors.HexColor("#718096"))
    c.drawString(60, 90, f"Event Date: {event_date_str}")
    c.drawString(60, 70, f"Issue Date: {issue_date_str}")
    c.drawString(60, 50, f"Certificate No: {cert.certificate_number}")

    # Generate QR Code image for Verification
    verify_url = f"/api/certificates/verify/{cert.verification_code}"
    qr_img = qrcode.make(verify_url)
    qr_buffer = io.BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    img_reader = ImageReader(qr_buffer)
    c.drawImage(img_reader, page_width - 160, 45, width=95, height=95)

    c.setFont("Helvetica", 8)
    c.drawCentredString(page_width - 112, 35, "Verification Code:")
    c.drawCentredString(page_width - 112, 25, cert.verification_code)

    c.showPage()
    c.save()

    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
