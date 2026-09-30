import datetime
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.database import SessionLocal
from app import models, auth
from app.services import certificate_service

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()


def get_token(email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200, f"Login failed for {email}: {response.json()}"
    return response.json()["access_token"]


def get_or_create_student(db, email: str, ra_num: str, name: str) -> models.User:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            password_hash=auth.get_password_hash("password123"),
            full_name=name,
            system_role="STUDENT",
            ra_number=ra_num,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_1_my_certificates_requires_authentication():
    """1. GET /api/certificates/my requires authentication (401)."""
    response = client.get("/api/certificates/my")
    assert response.status_code == 401


def test_2_student_isolation_and_no_other_student_access():
    """2 & 3. Student receives only their own certificates and cannot see other students'."""
    db = SessionLocal()
    try:
        s1 = get_or_create_student(db, "cert_std1@campusflow.edu", "RA7777777777701", "Cert Student 1")
        s2 = get_or_create_student(db, "cert_std2@campusflow.edu", "RA7777777777702", "Cert Student 2")

        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        # Create completed event
        ev = models.Event(
            club_id=club.id, title="Cert Isolation Ev", category="Technical", venue="Auditorium",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=100, status="COMPLETED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()

        # Register and mark attendance for s1 ONLY
        r1 = models.EventRegistration(event_id=ev.id, student_id=s1.id, status="REGISTERED")
        a1 = models.Attendance(event_id=ev.id, student_id=s1.id, marked_by_id=admin.id)
        db.add_all([r1, a1])
        db.commit()

        # Generate cert for s1
        c1 = certificate_service.generate_certificate_for_student(db, ev.id, s1.id)
        assert c1 is not None
        c1_num = c1.certificate_number
    finally:
        db.close()

    t1 = get_token("cert_std1@campusflow.edu")
    t2 = get_token("cert_std2@campusflow.edu")

    res1 = client.get("/api/certificates/my", headers={"Authorization": f"Bearer {t1}"})
    res2 = client.get("/api/certificates/my", headers={"Authorization": f"Bearer {t2}"})

    assert res1.status_code == 200
    assert res2.status_code == 200

    certs1 = res1.json()
    certs2 = res2.json()

    assert any(c["certificate_number"] == c1_num for c in certs1)
    assert not any(c["certificate_number"] == c1_num for c in certs2)



def test_4_5_6_certificate_lifecycle_state_checks():
    """4, 5 & 6. Cannot create cert for APPROVED or ONGOING event; CAN create for COMPLETED."""
    db = SessionLocal()
    try:
        s = get_or_create_student(db, "cert_lifecycle_std@campusflow.edu", "RA7777777777703", "Cert Lifecycle Student")
        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev_approved = models.Event(
            club_id=club.id, title="APPROVED Ev", category="Technical", venue="V1",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=100, status="APPROVED", created_by_id=admin.id
        )
        ev_ongoing = models.Event(
            club_id=club.id, title="ONGOING Ev", category="Technical", venue="V2",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=100, status="ONGOING", created_by_id=admin.id
        )
        db.add_all([ev_approved, ev_ongoing])
        db.commit()

        # Register & add attendance
        db.add_all([
            models.EventRegistration(event_id=ev_approved.id, student_id=s.id, status="REGISTERED"),
            models.Attendance(event_id=ev_approved.id, student_id=s.id, marked_by_id=admin.id),
            models.EventRegistration(event_id=ev_ongoing.id, student_id=s.id, status="REGISTERED"),
            models.Attendance(event_id=ev_ongoing.id, student_id=s.id, marked_by_id=admin.id)
        ])
        db.commit()

        # 4. Cannot create for APPROVED
        c_app = certificate_service.generate_certificate_for_student(db, ev_approved.id, s.id)
        assert c_app is None

        # 5. Cannot create for ONGOING
        c_ong = certificate_service.generate_certificate_for_student(db, ev_ongoing.id, s.id)
        assert c_ong is None

        # 6. Change status to COMPLETED -> CAN create
        ev_ongoing.status = "COMPLETED"
        db.commit()

        c_comp = certificate_service.generate_certificate_for_student(db, ev_ongoing.id, s.id)
        assert c_comp is not None
        assert c_comp.event_id == ev_ongoing.id
    finally:
        db.close()


def test_7_8_registration_without_attendance_does_not_qualify():
    """7 & 8. Registration without Attendance does NOT qualify; Attendance DOES qualify."""
    db = SessionLocal()
    try:
        s_reg_only = get_or_create_student(db, "reg_only_cert@campusflow.edu", "RA7777777777704", "Reg Only Cert")
        s_att = get_or_create_student(db, "att_cert@campusflow.edu", "RA7777777777705", "Att Cert")

        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev = models.Event(
            club_id=club.id, title="Comp Ev Reg vs Att", category="Technical", venue="V3",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=100, status="COMPLETED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()

        # s_reg_only: Registered ONLY
        r_only = models.EventRegistration(event_id=ev.id, student_id=s_reg_only.id, status="REGISTERED")

        # s_att: Registered AND Attended
        r_att = models.EventRegistration(event_id=ev.id, student_id=s_att.id, status="REGISTERED")
        att = models.Attendance(event_id=ev.id, student_id=s_att.id, marked_by_id=admin.id)
        db.add_all([r_only, r_att, att])
        db.commit()

        # 7. Reg only -> None
        c_reg_only = certificate_service.generate_certificate_for_student(db, ev.id, s_reg_only.id)
        assert c_reg_only is None

        # 8. Actual Attendance -> Certificate created
        c_att = certificate_service.generate_certificate_for_student(db, ev.id, s_att.id)
        assert c_att is not None
    finally:
        db.close()


def test_9_10_duplicate_certificate_prevention_and_uniqueness():
    """9 & 10. Duplicate certificate cannot be created for same student/event; ID/number is unique."""
    db = SessionLocal()
    try:
        s = get_or_create_student(db, "dup_cert_std@campusflow.edu", "RA7777777777706", "Dup Cert Student")
        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev = models.Event(
            club_id=club.id, title="Dup Test Ev", category="Technical", venue="V4",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=100, status="COMPLETED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()

        db.add_all([
            models.EventRegistration(event_id=ev.id, student_id=s.id, status="REGISTERED"),
            models.Attendance(event_id=ev.id, student_id=s.id, marked_by_id=admin.id)
        ])
        db.commit()

        # First generation
        c1 = certificate_service.generate_certificate_for_student(db, ev.id, s.id)
        assert c1 is not None

        # Second generation (must return same existing record, no duplicate inserted)
        c2 = certificate_service.generate_certificate_for_student(db, ev.id, s.id)
        assert c2 is not None
        assert c1.id == c2.id
        assert c1.certificate_number == c2.certificate_number

        count = db.query(models.Certificate).filter(
            models.Certificate.event_id == ev.id,
            models.Certificate.student_id == s.id
        ).count()
        assert count == 1
    finally:
        db.close()


def test_11_12_13_verification_endpoint_and_security():
    """11, 12 & 13. Verification returns valid info; invalid returns 404; no secrets exposed."""
    db = SessionLocal()
    try:
        s = get_or_create_student(db, "verify_cert_std@campusflow.edu", "RA7777777777707", "Verify Cert Student")
        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev = models.Event(
            club_id=club.id, title="Verification Ev Title", category="Technical", venue="V5",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=100, status="COMPLETED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()

        db.add_all([
            models.EventRegistration(event_id=ev.id, student_id=s.id, status="REGISTERED"),
            models.Attendance(event_id=ev.id, student_id=s.id, marked_by_id=admin.id)
        ])
        db.commit()

        cert = certificate_service.generate_certificate_for_student(db, ev.id, s.id)
        assert cert is not None
        cert_num = cert.certificate_number
        v_code = cert.verification_code
    finally:
        db.close()

    # 11. Verify by certificate number
    res_num = client.get(f"/api/certificates/verify/{cert_num}")
    assert res_num.status_code == 200
    data = res_num.json()
    assert data["certificate_number"] == cert_num
    assert data["student_name"] == "Verify Cert Student"
    assert data["event_title"] == "Verification Ev Title"
    assert data["status"] == "VALID"

    # Verify by verification code
    res_code = client.get(f"/api/certificates/verify/{v_code}")
    assert res_code.status_code == 200
    assert res_code.json()["certificate_number"] == cert_num

    # 12. Invalid identifier returns 404
    res_invalid = client.get("/api/certificates/verify/INVALID-NONEXISTENT-CODE")
    assert res_invalid.status_code == 404

    # 13. Check that no sensitive credentials are in verification payload
    raw_text = res_num.text.lower()
    assert "password" not in raw_text
    assert "password_hash" not in raw_text
    assert "jwt" not in raw_text
    assert "secret" not in raw_text


def test_14_pdf_download_endpoint():
    """14. PDF certificate endpoint returns application/pdf binary stream."""
    db = SessionLocal()
    try:
        s = get_or_create_student(db, "pdf_cert_std@campusflow.edu", "RA7777777777708", "PDF Cert Student")
        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev = models.Event(
            club_id=club.id, title="PDF Test Event", category="Technical", venue="V6",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=100, status="COMPLETED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()

        db.add_all([
            models.EventRegistration(event_id=ev.id, student_id=s.id, status="REGISTERED"),
            models.Attendance(event_id=ev.id, student_id=s.id, marked_by_id=admin.id)
        ])
        db.commit()

        cert = certificate_service.generate_certificate_for_student(db, ev.id, s.id)
        cert_num = cert.certificate_number
    finally:
        db.close()

    res = client.get(f"/api/certificates/{cert_num}/pdf")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert res.content.startswith(b"%PDF")
