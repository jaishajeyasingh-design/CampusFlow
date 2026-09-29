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

def get_token(email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200, f"Login failed for {email}: {response.json()}"
    return response.json()["access_token"]


def test_attack_1_student_accessing_super_admin_timetable():
    """Test attack vector: Student accessing Super Admin timetable creation/edit endpoint."""
    student_token = get_token("student1@campusflow.edu")

    # Student attempting to create timetable structure
    response = client.post(
        "/api/timetable/structures",
        headers={"Authorization": f"Bearer {student_token}"},
        json={
            "name": "Malicious Timetable",
            "working_days": "MON",
            "effective_from": "2026-10-01T00:00:00",
            "periods": []
        }
    )
    assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}: {response.json()}"
    assert "Access denied" in response.json()["detail"] or "not authorized" in response.json()["detail"]


def test_attack_2_club_admin_editing_timetable():
    """Test attack vector: Club Admin attempting to edit a timetable structure."""
    club_admin_token = get_token("clubadmin@campusflow.edu")

    response = client.put(
        "/api/timetable/structures/1",
        headers={"Authorization": f"Bearer {club_admin_token}"},
        json={
            "name": "Unauthorized Edit",
            "working_days": "MON,TUE",
            "effective_from": "2026-10-01T00:00:00",
            "periods": []
        }
    )
    assert response.status_code == 403, f"Expected 403 Forbidden for Club Admin timetable edit, got {response.status_code}"


def test_attack_3_student_accessing_another_students_od():
    """Test attack vector: Student 2 attempting to view Student 1's OD request."""
    student2_token = get_token("student2@campusflow.edu")

    # OD Request #1 belongs to Student 1
    response = client.get(
        "/api/od-requests/1",
        headers={"Authorization": f"Bearer {student2_token}"}
    )
    assert response.status_code == 403, f"Expected 403 Forbidden for accessing another student's OD, got {response.status_code}"
    assert "only view your own OD requests" in response.json()["detail"]


def test_attack_4_unrelated_faculty_accessing_club_management():
    """Test attack vector: Faculty Coordinator from another department attempting to manage club details."""
    db = SessionLocal()
    # Create an unrelated faculty user
    unrelated_faculty = db.query(models.User).filter(models.User.email == "unrelated_faculty@campusflow.edu").first()
    if not unrelated_faculty:
        unrelated_faculty = models.User(
            email="unrelated_faculty@campusflow.edu",
            password_hash=auth.get_password_hash("password123"),
            full_name="Dr. Stranger",
            system_role="FACULTY",
            department="Physics",
            is_active=True
        )
        db.add(unrelated_faculty)
        db.commit()
    db.close()

    faculty_token = get_token("unrelated_faculty@campusflow.edu")

    # Attempt to manage Club #1 (Coding Club)
    response = client.put(
        "/api/clubs/1/manage",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"name": "Hacked Club Name"}
    )
    assert response.status_code == 403, f"Expected 403 Forbidden for unrelated faculty club management, got {response.status_code}"


def test_attack_5_club_admin_or_student_approving_event():
    """Test attack vector: Club Admin trying to approve their own event."""
    club_admin_token = get_token("clubadmin@campusflow.edu")

    response = client.post(
        "/api/events/2/approve",  # Event 2 is PENDING_FACULTY_APPROVAL
        headers={"Authorization": f"Bearer {club_admin_token}"},
        json={"status": "APPROVED", "faculty_remark": "Self approved"}
    )
    assert response.status_code == 403, f"Expected 403 Forbidden for Club Admin approving event, got {response.status_code}"


def test_attack_6_student_approving_od():
    """Test attack vector: Student attempting to approve an OD request."""
    student1_token = get_token("student1@campusflow.edu")

    response = client.post(
        "/api/od-requests/1/approve",
        headers={"Authorization": f"Bearer {student1_token}"},
        json={"status": "APPROVED", "mentor_remark": "Self approved OD"}
    )
    assert response.status_code == 403, f"Expected 403 Forbidden for Student approving OD, got {response.status_code}"


def test_attack_7_student_registering_for_unapproved_event():
    """Test attack vector: Student attempting to register for a DRAFT or PENDING event."""
    student1_token = get_token("student1@campusflow.edu")

    # Event #1 is DRAFT, Event #2 is PENDING_FACULTY_APPROVAL
    response = client.post(
        "/api/events/2/register",
        headers={"Authorization": f"Bearer {student1_token}"}
    )
    assert response.status_code in [400, 403], f"Expected 400/403 Error for registering for unapproved event, got {response.status_code}"
    assert "ONLY for APPROVED events" in response.json()["detail"]


def test_legitimate_super_admin_timetable_creation():
    """Verify legitimate Super Admin action succeeds."""
    super_admin_token = get_token("superadmin@campusflow.edu")

    response = client.post(
        "/api/timetable/structures",
        headers={"Authorization": f"Bearer {super_admin_token}"},
        json={
            "name": "Spring 2027 Timetable",
            "working_days": "MON,TUE,WED,THU,FRI",
            "effective_from": "2027-01-01T00:00:00",
            "is_active": False,
            "periods": [
                {"period_number": 1, "start_time": "09:00", "end_time": "09:50", "period_type": "CLASS"}
            ]
        }
    )
    assert response.status_code == 201, f"Expected 201 Created for Super Admin, got {response.status_code}: {response.json()}"
    assert response.json()["name"] == "Spring 2027 Timetable"
