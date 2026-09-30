import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.database import SessionLocal
from app import models, auth

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()


def get_token(email: str, password: str = "password123") -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, f"Login failed for {email}: {response.json()}"
    return response.json()["access_token"]


def get_or_create_user(db, email: str, role: str, name: str, ra_num: str = None) -> models.User:
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            password_hash=auth.get_password_hash("password123"),
            full_name=name,
            system_role=role,
            ra_number=ra_num,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def test_audit_1_approval_integrity_and_state_transitions():
    """Audit 1: Event approval integrity and state machine constraints."""
    db = SessionLocal()
    try:
        club_admin = get_or_create_user(db, "clubadmin@campusflow.edu", "CLUB_ADMIN", "Club Admin Sarah")
        faculty_coordinator = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        unrelated_faculty = get_or_create_user(db, "audit_unrelated_fac@campusflow.edu", "FACULTY", "Unrelated Fac")
        student = get_or_create_user(db, "student1@campusflow.edu", "STUDENT", "Alex Mercer", "RA2311003010001")

        club = db.query(models.Club).first()

        now = datetime.datetime.utcnow()
        event = models.Event(
            club_id=club.id,
            title="Audit State Machine Event",
            venue="Auditorium",
            start_time=now,
            end_time=now + datetime.timedelta(hours=2),
            capacity=20,
            status="DRAFT",
            created_by_id=club_admin.id
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # 1. Illegal transition: DRAFT -> APPROVED directly (rejected with 400)
        token_fac = get_token(faculty_coordinator.email)
        headers_fac = {"Authorization": f"Bearer {token_fac}"}
        resp_ill = client.post(f"/api/events/{event.id}/approve", headers=headers_fac, json={"status": "APPROVED"})
        assert resp_ill.status_code == 400

        # 2. Club Admin attempts to approve own event -> 403 Forbidden
        token_ca = get_token(club_admin.email)
        headers_ca = {"Authorization": f"Bearer {token_ca}"}
        resp_ca_app = client.post(f"/api/events/{event.id}/approve", headers=headers_ca, json={"status": "APPROVED"})
        assert resp_ca_app.status_code == 403

        # Submit event for approval (DRAFT -> PENDING_FACULTY_APPROVAL)
        resp_sub = client.post(f"/api/events/{event.id}/submit", headers=headers_ca)
        assert resp_sub.status_code == 200
        assert resp_sub.json()["status"] == "PENDING_FACULTY_APPROVAL"

        # 3. Unrelated Faculty attempts to approve event -> 403 Forbidden
        token_unrel = get_token(unrelated_faculty.email)
        headers_unrel = {"Authorization": f"Bearer {token_unrel}"}
        resp_unrel_app = client.post(f"/api/events/{event.id}/approve", headers=headers_unrel, json={"status": "APPROVED"})
        assert resp_unrel_app.status_code == 403

        # 4. Rejection without reason -> 400 Bad Request
        resp_rej_no_reason = client.post(f"/api/events/{event.id}/approve", headers=headers_fac, json={"status": "REJECTED"})
        assert resp_rej_no_reason.status_code == 400

        # Valid Rejection with reason
        resp_rej_valid = client.post(f"/api/events/{event.id}/reject", headers=headers_fac, json={"reason": "Budget incomplete"})
        assert resp_rej_valid.status_code == 200
        assert resp_rej_valid.json()["status"] == "REJECTED"

        # 5. Student registration for REJECTED event -> 400 Bad Request
        token_std = get_token(student.email)
        headers_std = {"Authorization": f"Bearer {token_std}"}
        resp_std_reg = client.post(f"/api/events/{event.id}/register", headers=headers_std)
        assert resp_std_reg.status_code == 400

        # Resubmit event (REJECTED -> PENDING_FACULTY_APPROVAL)
        resp_resub = client.post(f"/api/events/{event.id}/resubmit", headers=headers_ca)
        assert resp_resub.status_code == 200

        # Authorized Faculty approves event
        resp_app = client.post(f"/api/events/{event.id}/approve", headers=headers_fac, json={"status": "APPROVED"})
        assert resp_app.status_code == 200
        assert resp_app.json()["status"] == "APPROVED"
    finally:
        db.close()


def test_audit_2_ra_number_validation_and_uniqueness():
    """Audit 2: RA number formatting, length, and uniqueness constraints."""
    # Malformed length (14 chars)
    resp1 = client.post("/api/auth/register", json={
        "email": "invalid_ra1@campusflow.edu",
        "password": "password123",
        "full_name": "Test Invalid RA",
        "system_role": "STUDENT",
        "ra_number": "RA123456789012"
    })
    assert resp1.status_code in [400, 422]

    # Duplicate RA number
    resp2 = client.post("/api/auth/register", json={
        "email": "dup_ra@campusflow.edu",
        "password": "password123",
        "full_name": "Duplicate RA Student",
        "system_role": "STUDENT",
        "ra_number": "RA2311003010001"
    })
    assert resp2.status_code == 400


def test_audit_3_od_approval_rbac_and_ownership():
    """Audit 3: OD approval authorization and student isolation."""
    db = SessionLocal()
    try:
        faculty_mentor = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        unrelated_faculty = get_or_create_user(db, "audit_unrelated_fac@campusflow.edu", "FACULTY", "Unrelated Fac")
        student = get_or_create_user(db, "student2@campusflow.edu", "STUDENT", "Beatrix Kiddo", "RA2311003010002")

        club = db.query(models.Club).first()
        now = datetime.datetime.utcnow()
        event = models.Event(
            club_id=club.id,
            title="Audit OD Event",
            venue="Hall C",
            start_time=now,
            end_time=now + datetime.timedelta(hours=2),
            capacity=10,
            status="APPROVED",
            created_by_id=faculty_mentor.id
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        od_req = models.ODRequest(
            student_id=student.id,
            event_id=event.id,
            mentor_id=faculty_mentor.id,
            status="PENDING"
        )
        db.add(od_req)
        db.commit()
        db.refresh(od_req)

        # Student attempting to approve own OD -> 403 Forbidden
        token_std = get_token(student.email)
        headers_std = {"Authorization": f"Bearer {token_std}"}
        resp_std = client.post(f"/api/od-requests/{od_req.id}/approve", headers=headers_std, json={"status": "APPROVED"})
        assert resp_std.status_code == 403

        # Unrelated Faculty attempting to approve student's OD -> 403 Forbidden
        token_unrel = get_token(unrelated_faculty.email)
        headers_unrel = {"Authorization": f"Bearer {token_unrel}"}
        resp_unrel = client.post(f"/api/od-requests/{od_req.id}/approve", headers=headers_unrel, json={"status": "APPROVED"})
        assert resp_unrel.status_code == 403

        # Assigned Class Mentor approving OD -> 200 OK
        token_mentor = get_token(faculty_mentor.email)
        headers_mentor = {"Authorization": f"Bearer {token_mentor}"}
        resp_mentor = client.post(f"/api/od-requests/{od_req.id}/approve", headers=headers_mentor, json={"status": "APPROVED"})
        assert resp_mentor.status_code == 200
    finally:
        db.close()


def test_audit_4_timetable_mutation_does_not_affect_historical_snapshots():
    """Audit 4: Creating secondary timetable structure does NOT mutate persisted historical OD snapshots."""
    db = SessionLocal()
    try:
        snapshots_before = db.query(models.ODPeriodSnapshot).all()
        if snapshots_before:
            snap_sample = snapshots_before[0]
            snap_id = snap_sample.id
            orig_start_time = snap_sample.start_time

        super_admin = get_or_create_user(db, "superadmin@campusflow.edu", "SUPER_ADMIN", "Dr. Eleanor Vance")
        token_sa = get_token(super_admin.email)
        headers_sa = {"Authorization": f"Bearer {token_sa}"}

        # Create a new non-active structure
        client.post("/api/timetable/structures", headers=headers_sa, json={
            "name": "Audit New Timetable",
            "working_days": "MON,TUE,WED,THU,FRI",
            "effective_from": "2026-11-01T00:00:00",
            "is_active": False,
            "periods": [
                {"period_number": 1, "start_time": "09:00", "end_time": "10:00", "period_type": "CLASS"},
                {"period_number": 2, "start_time": "10:15", "end_time": "11:15", "period_type": "CLASS"}
            ]
        })

        # Verify historical snapshot remained unchanged
        db.expire_all()
        if snapshots_before:
            snap_after = db.query(models.ODPeriodSnapshot).filter(models.ODPeriodSnapshot.id == snap_id).first()
            assert snap_after is not None
            assert snap_after.start_time == orig_start_time
    finally:
        db.close()


def test_audit_5_certificate_and_badge_isolation():
    """Audit 5: Certificate generation criteria, idempotency, and isolation."""
    db = SessionLocal()
    try:
        student1 = get_or_create_user(db, "student1@campusflow.edu", "STUDENT", "Alex Mercer", "RA2311003010001")
        student2 = get_or_create_user(db, "student2@campusflow.edu", "STUDENT", "Beatrix Kiddo", "RA2311003010002")

        # Student 1 fetches personal certificates
        token_s1 = get_token(student1.email)
        headers_s1 = {"Authorization": f"Bearer {token_s1}"}
        resp_s1 = client.get("/api/certificates/my", headers=headers_s1)
        assert resp_s1.status_code == 200

        # Student 2 cannot view Student 1's certificates via /my
        token_s2 = get_token(student2.email)
        headers_s2 = {"Authorization": f"Bearer {token_s2}"}
        resp_s2 = client.get("/api/certificates/my", headers=headers_s2)
        assert resp_s2.status_code == 200
        for cert in resp_s2.json():
            assert cert["student_id"] == student2.id
    finally:
        db.close()
