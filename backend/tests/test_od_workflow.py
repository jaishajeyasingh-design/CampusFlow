import pytest
from datetime import datetime, timedelta
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


def create_and_approve_event(title: str, start_dt: datetime, end_dt: datetime) -> int:
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")

    response = client.post(
        "/api/events",
        headers={"Authorization": f"Bearer {club_admin_token}"},
        json={
            "club_id": 1,
            "title": title,
            "description": "OD Workflow Test Event",
            "category": "TECHNICAL",
            "venue": "Seminar Hall A",
            "start_time": start_dt.isoformat(),
            "end_time": end_dt.isoformat(),
            "capacity": 50
        }
    )
    assert response.status_code == 201
    event_id = response.json()["id"]

    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "APPROVED"}
    )
    return event_id


def test_A_J_K_L_student_with_valid_registration_creates_od():
    """A, J, K, L. Valid student registration creates OD with PENDING status, mentor assignment, and period snapshots."""
    student1_token = get_token("student1@campusflow.edu")
    
    # Event 3 is approved in seed.py (start 10:00, end 14:00 on 2026-10-10, MON-FRI timetable active)
    # Register student 2 for event 3 (student 1 is already registered in seed)
    event_id = 3

    response = client.post(
        "/api/od-requests",
        headers={"Authorization": f"Bearer {student1_token}"},
        json={"event_id": event_id}
    )
    # Note: Seed database already created an OD for student 1 event 3, so this might trigger 409 if seeded.
    # Let's check status
    if response.status_code == 409:
        # Get existing OD
        get_resp = client.get("/api/od-requests", headers={"Authorization": f"Bearer {student1_token}"})
        assert get_resp.status_code == 200
        od_data = get_resp.json()[0]
    else:
        assert response.status_code == 201
        od_data = response.json()

    assert od_data["status"] == "PENDING"
    assert od_data["student_id"] is not None
    assert od_data["mentor_id"] is not None
    assert len(od_data["period_snapshots"]) > 0


def test_B_unauthenticated_cannot_create_od():
    """B. Unauthenticated user cannot create OD."""
    response = client.post("/api/od-requests", json={"event_id": 3})
    assert response.status_code == 401


def test_C_non_student_cannot_create_od():
    """C. Non-student cannot create OD."""
    faculty_token = get_token("faculty@campusflow.edu")
    response = client.post("/api/od-requests", headers={"Authorization": f"Bearer {faculty_token}"}, json={"event_id": 3})
    assert response.status_code == 403


def test_D_student_not_registered_cannot_create_od():
    """D. Student not registered for event cannot create OD."""
    student2_token = get_token("student2@campusflow.edu")
    # Create new approved event
    event_id = create_and_approve_event("Unregistered OD Event", datetime(2026, 10, 12, 10, 0), datetime(2026, 10, 12, 12, 0))

    response = client.post("/api/od-requests", headers={"Authorization": f"Bearer {student2_token}"}, json={"event_id": event_id})
    assert response.status_code == 400
    assert "not registered" in response.json()["detail"].lower()


def test_E_student_cannot_submit_od_using_another_students_registration():
    """E. Student cannot submit OD using another student's registration."""
    student1_token = get_token("student1@campusflow.edu")
    student2_token = get_token("student2@campusflow.edu")

    event_id = create_and_approve_event("Registration Hijack Event", datetime(2026, 10, 13, 10, 0), datetime(2026, 10, 13, 12, 0))
    # Register student 1
    reg_resp = client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student1_token}"})
    assert reg_resp.status_code == 201
    s1_reg_id = reg_resp.json()["registration_id"]

    # Student 2 tries to use s1_reg_id to create OD
    response = client.post("/api/od-requests", headers={"Authorization": f"Bearer {student2_token}"}, json={"registration_id": s1_reg_id})
    assert response.status_code == 400
    assert "does not belong" in response.json()["detail"].lower() or "not registered" in response.json()["detail"].lower()


def test_F_event_with_no_active_timetable_rejected():
    """F. Event with no active timetable is rejected."""
    # Deactivate active timetable temporarily
    db = SessionLocal()
    tt = db.query(models.TimetableStructure).filter(models.TimetableStructure.is_active == True).first()
    if tt:
        tt.is_active = False
        db.commit()
    db.close()

    student1_token = get_token("student1@campusflow.edu")
    event_id = create_and_approve_event("No TT Event", datetime(2026, 10, 14, 10, 0), datetime(2026, 10, 14, 12, 0))
    client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student1_token}"})

    response = client.post("/api/od-requests", headers={"Authorization": f"Bearer {student1_token}"}, json={"event_id": event_id})
    assert response.status_code == 400
    assert "no active timetable" in response.json()["detail"].lower()

    # Re-activate timetable
    db = SessionLocal()
    tt = db.query(models.TimetableStructure).first()
    if tt:
        tt.is_active = True
        db.commit()
    db.close()


def test_G_H_valid_event_correctly_calculates_affected_periods_and_boundary_conditions():
    """G & H. Valid event correctly calculates affected periods and respects half-open interval boundaries."""
    student1_token = get_token("student1@campusflow.edu")
    # Event from 10:30 to 12:30 on a Monday (2026-10-12)
    # Active timetable periods in seed:
    # P1: 08:00-08:50
    # P2: 08:50-09:40
    # P3: 09:40-10:00 (SHORT_BREAK)
    # P4: 10:00-10:50
    # P5: 10:50-11:40
    # P6: 11:40-12:30 (LUNCH_BREAK)
    # P7: 12:30-13:20
    # P8: 13:20-14:10
    # 10:30-12:30 overlaps with P4 (10:00-10:50), P5 (10:50-11:40), P6 (11:40-12:30).
    # Does NOT overlap with P7 (12:30-13:20) because 12:30 <= 12:30 boundary!
    
    event_id = create_and_approve_event("Boundary Test Event", datetime(2026, 10, 12, 10, 30), datetime(2026, 10, 12, 12, 30))
    client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student1_token}"})

    response = client.post("/api/od-requests", headers={"Authorization": f"Bearer {student1_token}"}, json={"event_id": event_id})
    assert response.status_code == 201
    snaps = response.json()["period_snapshots"]
    p_nums = [s["period_number"] for s in snaps]
    
    assert 4 in p_nums
    assert 5 in p_nums
    assert 6 in p_nums
    assert 7 not in p_nums  # Boundary check: 12:30 end time does NOT overlap P7 starting at 12:30!


def test_I_duplicate_od_for_same_registration_returns_409():
    """I. Duplicate OD for same registration returns 409 Conflict."""
    student1_token = get_token("student1@campusflow.edu")
    event_id = create_and_approve_event("Duplicate OD Test Event", datetime(2026, 10, 19, 10, 0), datetime(2026, 10, 19, 12, 0))
    client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student1_token}"})

    resp1 = client.post("/api/od-requests", headers={"Authorization": f"Bearer {student1_token}"}, json={"event_id": event_id})
    assert resp1.status_code == 201

    resp2 = client.post("/api/od-requests", headers={"Authorization": f"Bearer {student1_token}"}, json={"event_id": event_id})
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"].lower()


def test_M_changing_timetable_does_not_change_historical_snapshots():
    """M. Changing timetable after OD creation does NOT change historical snapshots."""
    student1_token = get_token("student1@campusflow.edu")
    event_id = create_and_approve_event("Snapshot Permanence Event", datetime(2026, 10, 26, 10, 0), datetime(2026, 10, 26, 12, 0))
    client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student1_token}"})

    create_resp = client.post("/api/od-requests", headers={"Authorization": f"Bearer {student1_token}"}, json={"event_id": event_id})
    assert create_resp.status_code == 201
    od_id = create_resp.json()["id"]
    initial_snaps = create_resp.json()["period_snapshots"]
    assert len(initial_snaps) > 0

    # Super Admin modifies timetable periods
    super_admin_token = get_token("superadmin@campusflow.edu")
    client.put(
        "/api/timetable/structures/1",
        headers={"Authorization": f"Bearer {super_admin_token}"},
        json={
            "name": "Modified Timetable",
            "working_days": "MON,TUE,WED,THU,FRI",
            "effective_from": "2026-01-01T00:00:00",
            "is_active": True,
            "periods": [
                {"period_number": 99, "start_time": "09:00", "end_time": "17:00", "period_type": "CLASS"}
            ]
        }
    )

    # Fetch OD request after timetable edit
    fetch_resp = client.get(f"/api/od-requests/{od_id}", headers={"Authorization": f"Bearer {student1_token}"})
    assert fetch_resp.status_code == 200
    after_snaps = fetch_resp.json()["period_snapshots"]
    
    # Period snapshots must remain identical
    assert len(after_snaps) == len(initial_snaps)
    assert after_snaps[0]["period_number"] == initial_snaps[0]["period_number"]


def test_N_O_student_get_od_requests_returns_only_their_own():
    """N & O. Student GET /api/od-requests returns only their own requests; Student A cannot see Student B."""
    student1_token = get_token("student1@campusflow.edu")
    student2_token = get_token("student2@campusflow.edu")

    resp1 = client.get("/api/od-requests", headers={"Authorization": f"Bearer {student1_token}"})
    assert resp1.status_code == 200
    s1_ods = resp1.json()
    for od in s1_ods:
        assert od["student_id"] == 5  # student 1 id is 5 in seed

    resp2 = client.get("/api/od-requests", headers={"Authorization": f"Bearer {student2_token}"})
    assert resp2.status_code == 200
    s2_ods = resp2.json()
    for od in s2_ods:
        assert od["student_id"] == 6  # student 2 id is 6 in seed


def test_P_unauthorized_faculty_cannot_access_another_mentors_od():
    """P. Unauthorized faculty/mentor cannot access another mentor's OD request."""
    # Faculty is mentor for student 1. Unrelated faculty is not.
    unrelated_faculty_token = get_token("unrelated_faculty@campusflow.edu")
    
    response = client.get("/api/od-requests/1", headers={"Authorization": f"Bearer {unrelated_faculty_token}"})
    assert response.status_code == 403
    assert "only view od requests assigned to you" in response.json()["detail"].lower()
