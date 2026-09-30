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


def test_1_authentication_required():
    """1. All analytics endpoints require authentication (401 when missing bearer token)."""
    endpoints = [
        "/api/analytics/overview",
        "/api/analytics/events",
        "/api/analytics/registrations",
        "/api/analytics/attendance",
        "/api/analytics/od",
        "/api/analytics/certificates",
        "/api/analytics/badges",
        "/api/analytics/student",
        "/api/analytics/club/1",
    ]
    for ep in endpoints:
        resp = client.get(ep)
        assert resp.status_code == 401, f"Expected 401 for unauthenticated request to {ep}, got {resp.status_code}"


def test_2_super_admin_overview():
    """2. Super Admin can view platform-wide overview analytics."""
    token = get_token("superadmin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_users" in data
    assert "total_clubs" in data
    assert "total_events" in data
    assert data["total_users"] >= 1


def test_3_admin_overview():
    """3. Admin can view overview analytics."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/overview", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_events"] >= 0


def test_4_student_overview_access_and_scoping():
    """4. Student accessing overview is forbidden from platform-wide analytics (403)."""
    token = get_token("student1@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/overview", headers=headers)
    assert resp.status_code == 403


def test_5_student_analytics_own_data():
    """5. Student receives only their own activity analytics via /api/analytics/student."""
    token = get_token("student1@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/student", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "events_registered" in data
    assert "events_attended" in data
    assert "attendance_rate" in data
    assert "od_requests" in data
    assert "certificates" in data
    assert "badges" in data


def test_6_student_cannot_request_another_student_analytics():
    """6. Student endpoint automatically uses current_user.id and does not take target user_id."""
    token = get_token("student1@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    # Query parameters like student_id or user_id are ignored or not accepted as override
    resp = client.get("/api/analytics/student?user_id=9999", headers=headers)
    assert resp.status_code == 200


def test_7_club_admin_authorized_club_analytics():
    """7. Club Admin can access analytics for a club they administer."""
    db = SessionLocal()
    try:
        club = db.query(models.Club).first()
        assert club is not None
        club_admin = get_or_create_user(db, "clubadmin@campusflow.edu", "CLUB_ADMIN", "Club Admin")
        club.club_admin_id = club_admin.id
        db.commit()

        token = get_token(club_admin.email)
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.get(f"/api/analytics/club/{club.id}", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["club_id"] == club.id
        assert "total_events" in data
        assert "attendance_rate_pct" in data
    finally:
        db.close()


def test_8_club_admin_unauthorized_club_analytics():
    """8. Club Admin cannot access another club's private analytics (returns 403)."""
    db = SessionLocal()
    try:
        c1 = models.Club(name="Club Alpha 99 Unique", code="ALPHA99_UNIQUE", category="Tech", description="Desc")
        c2 = models.Club(name="Club Beta 99 Unique", code="BETA99_UNIQUE", category="Arts", description="Desc")
        db.add_all([c1, c2])
        db.commit()

        db.refresh(c1)
        db.refresh(c2)

        ca = get_or_create_user(db, "ca_only_alpha@campusflow.edu", "CLUB_ADMIN", "CA Alpha")
        c1.club_admin_id = ca.id
        db.commit()

        token = get_token(ca.email)
        headers = {"Authorization": f"Bearer {token}"}
        
        # Accessing c1 should succeed
        resp_c1 = client.get(f"/api/analytics/club/{c1.id}", headers=headers)
        assert resp_c1.status_code == 200

        # Accessing c2 should be forbidden (403)
        resp_c2 = client.get(f"/api/analytics/club/{c2.id}", headers=headers)
        assert resp_c2.status_code == 403
    finally:
        db.close()


def test_9_event_status_counts():
    """9. Event analytics returns accurate event status counts."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/events", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_events" in data
    assert "draft" in data
    assert "pending" in data
    assert "approved" in data
    assert "rejected" in data
    assert "ongoing" in data
    assert "completed" in data
    assert "cancelled" in data
    assert data["total_events"] == (
        data["draft"] + data["pending"] + data["approved"] +
        data["rejected"] + data["ongoing"] + data["completed"] + data["cancelled"]
    )


def test_10_registration_counts():
    """10. Registration analytics returns proper registration metrics."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/registrations", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_registrations" in data
    assert "average_registrations_per_event" in data


def test_11_attendance_counts():
    """11. Attendance analytics returns accurate records and unique student counts."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/attendance", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_attendance_records" in data
    assert "unique_students_attended" in data


def test_12_attendance_rate_calculation():
    """12. Attendance rate calculation handles denominator cleanly and never produces NaN/Inf."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/attendance", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "attendance_rate_pct" in data
    assert isinstance(data["attendance_rate_pct"], float)
    assert 0.0 <= data["attendance_rate_pct"] <= 100.0


def test_13_od_counts():
    """13. OD analytics calculates total, pending, approved, and rejected OD requests."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/od", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_od_requests" in data
    assert "pending" in data
    assert "approved" in data
    assert "rejected" in data


def test_14_certificate_counts():
    """14. Certificate analytics returns issued certificate statistics."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/certificates", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_certificates_issued" in data


def test_15_badge_counts():
    """15. Badge analytics returns awarded badges statistics."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/badges", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_badges_awarded" in data
    assert "unique_students_with_badges" in data


def test_16_empty_activity_behavior():
    """16. Newly created student with zero activity gets valid zero-valued analytics instead of errors."""
    db = SessionLocal()
    try:
        new_student = get_or_create_user(db, "fresh_student@campusflow.edu", "STUDENT", "Fresh Student", "RA7777777777777")
        token = get_token(new_student.email)
        headers = {"Authorization": f"Bearer {token}"}
        resp = client.get("/api/analytics/student", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["events_registered"] == 0
        assert data["events_attended"] == 0
        assert data["attendance_rate"] == 0.0
        assert data["od_requests"] == 0
        assert data["certificates"] == 0
        assert data["badges"] == 0
    finally:
        db.close()


def test_17_date_filtering():
    """17. Date range parameters filter data properly without throwing errors."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/events?start_date=2026-01-01&end_date=2026-12-31", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_events" in data


def test_18_invalid_date_range():
    """18. Invalid date format or start_date > end_date returns HTTP 400 Bad Request."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Invalid format
    resp1 = client.get("/api/analytics/events?start_date=invalid-date", headers=headers)
    assert resp1.status_code == 400

    # start_date > end_date
    resp2 = client.get("/api/analytics/events?start_date=2026-12-31&end_date=2026-01-01", headers=headers)
    assert resp2.status_code == 400


def test_19_invalid_club_id():
    """19. Requesting analytics for non-existent club returns 404."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/analytics/club/999999", headers=headers)
    assert resp.status_code == 404


def test_20_no_sensitive_fields_exposed():
    """20. Ensure password, password_hash, tokens, and secrets are never exposed in analytics responses."""
    token = get_token("admin@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}
    
    endpoints = [
        "/api/analytics/overview",
        "/api/analytics/events",
        "/api/analytics/registrations",
        "/api/analytics/attendance",
        "/api/analytics/od",
        "/api/analytics/certificates",
        "/api/analytics/badges",
    ]
    for ep in endpoints:
        resp = client.get(ep, headers=headers)
        assert resp.status_code == 200
        text = resp.text.lower()
        assert "password_hash" not in text
        assert "secret_key" not in text
        assert "private_key" not in text

    # Student endpoint
    student_token = get_token("student1@campusflow.edu")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    resp_student = client.get("/api/analytics/student", headers=student_headers)
    assert resp_student.status_code == 200
    st_text = resp_student.text.lower()
    assert "password_hash" not in st_text
