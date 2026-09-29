import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.database import SessionLocal
from app import models

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()


def get_token(email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200, f"Login failed for {email}: {response.json()}"
    return response.json()["access_token"]


def test_1_authenticated_student_with_registrations():
    """1. Authenticated student with registrations -> 200 + correct events."""
    student_token = get_token("student1@campusflow.edu")
    
    response = client.get("/api/events/my", headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    
    # Verify structure contains registration & event details
    reg = data[0]
    assert "id" in reg
    assert "event_id" in reg
    assert "student_id" in reg
    assert "status" in reg
    assert "qr_code" in reg
    assert "registered_at" in reg
    assert "event" in reg
    assert reg["event"] is not None
    assert "title" in reg["event"]
    assert "venue" in reg["event"]
    assert "start_time" in reg["event"]
    assert "end_time" in reg["event"]
    assert "club" in reg["event"]


def test_2_authenticated_student_with_no_registrations():
    """2. Authenticated student with no registrations -> 200 + []."""
    student2_token = get_token("student2@campusflow.edu")
    
    response = client.get("/api/events/my", headers={"Authorization": f"Bearer {student2_token}"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


def test_3_student_a_cannot_see_student_b_registrations():
    """3. Student A cannot see Student B registrations."""
    student1_token = get_token("student1@campusflow.edu")
    student2_token = get_token("student2@campusflow.edu")
    
    # Get Student 1 registrations
    resp1 = client.get("/api/events/my", headers={"Authorization": f"Bearer {student1_token}"})
    assert resp1.status_code == 200
    student1_regs = resp1.json()
    student1_reg_ids = [r["id"] for r in student1_regs]
    assert len(student1_reg_ids) > 0

    # Get Student 2 registrations
    resp2 = client.get("/api/events/my", headers={"Authorization": f"Bearer {student2_token}"})
    assert resp2.status_code == 200
    student2_regs = resp2.json()
    student2_reg_ids = [r["id"] for r in student2_regs]
    
    # Student B MUST NOT see Student A's registration IDs
    for s1_id in student1_reg_ids:
        assert s1_id not in student2_reg_ids


def test_4_unauthenticated_request_returns_401():
    """4. Unauthenticated request -> 401."""
    response = client.get("/api/events/my")
    assert response.status_code == 401


def test_5_non_student_role_returns_403():
    """5. Non-student role -> 403."""
    faculty_token = get_token("faculty@campusflow.edu")
    club_admin_token = get_token("clubadmin@campusflow.edu")
    admin_token = get_token("admin@campusflow.edu")

    for token in [faculty_token, club_admin_token, admin_token]:
        response = client.get("/api/events/my", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 403, f"Expected 403, got {response.status_code} for non-student role"


def test_6_response_does_not_expose_passwords_or_private_user_data():
    """6. Response does not expose password/hash/private user data."""
    student_token = get_token("student1@campusflow.edu")
    
    response = client.get("/api/events/my", headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 200
    raw_text = response.text.lower()

    # Ensure sensitive user fields are absent
    assert "password" not in raw_text
    assert "password_hash" not in raw_text
    assert "hash" not in raw_text
