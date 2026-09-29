import pytest
from datetime import datetime, timedelta
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


def create_test_event(token: str, title: str = "Test Workshop", capacity: int = 10) -> int:
    now = datetime.utcnow()
    response = client.post(
        "/api/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "club_id": 1,
            "title": title,
            "description": "Comprehensive event test",
            "category": "TECHNICAL",
            "venue": "Lab 1",
            "start_time": (now + timedelta(days=1)).isoformat(),
            "end_time": (now + timedelta(days=1, hours=2)).isoformat(),
            "capacity": capacity
        }
    )
    assert response.status_code == 201, f"Failed to create event: {response.json()}"
    return response.json()["id"]


def test_A_club_admin_creates_event_as_draft():
    """A. Club Admin creates event -> status DRAFT"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    event_id = create_test_event(club_admin_token, "Draft Event")
    
    response = client.get(f"/api/events/{event_id}", headers={"Authorization": f"Bearer {club_admin_token}"})
    assert response.status_code == 200
    assert response.json()["status"] == "DRAFT"


def test_B_draft_to_pending_faculty_approval_submit():
    """B. DRAFT -> PENDING_FACULTY_APPROVAL -> success"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    event_id = create_test_event(club_admin_token, "Submittable Event")

    response = client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING_FACULTY_APPROVAL"


def test_C_pending_to_approved_by_authorized_faculty():
    """C. PENDING -> APPROVED by authorized faculty -> success"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")
    
    event_id = create_test_event(club_admin_token, "Approvable Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})

    response = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "APPROVED", "faculty_remark": "Approved for lab access"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"


def test_D_pending_to_rejected_by_authorized_faculty():
    """D. PENDING -> REJECTED by authorized faculty -> success"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Rejectable Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})

    response = client.post(
        f"/api/events/{event_id}/reject",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"reason": "Venue unavailable"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "REJECTED"
    assert response.json()["faculty_remark"] == "Venue unavailable"


def test_E_reject_without_reason_returns_400():
    """E. Reject without reason -> HTTP 400"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")

    event_id = create_test_event(club_admin_token, "No Reason Reject Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})

    response = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "REJECTED", "faculty_remark": ""}
    )
    assert response.status_code == 400
    assert "rejection reason is required" in response.json()["detail"].lower()


def test_F_unauthorized_faculty_approves_returns_403():
    """F. Unauthorized faculty approves -> HTTP 403"""
    db = SessionLocal()
    unrelated_faculty = db.query(models.User).filter(models.User.email == "unrelated_faculty@campusflow.edu").first()
    db.close()
    assert unrelated_faculty is not None

    club_admin_token = get_token("clubadmin@campusflow.edu")
    unrelated_faculty_token = get_token("unrelated_faculty@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Unauthorized Faculty Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})

    response = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {unrelated_faculty_token}"},
        json={"status": "APPROVED"}
    )
    assert response.status_code == 403


def test_G_club_admin_tries_to_approve_returns_403():
    """G. Club Admin tries to approve -> HTTP 403"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    event_id = create_test_event(club_admin_token, "Self Approve Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})

    response = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {club_admin_token}"},
        json={"status": "APPROVED"}
    )
    assert response.status_code == 403


def test_H_student_tries_to_approve_returns_403():
    """H. Student tries to approve -> HTTP 403"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    student_token = get_token("student1@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Student Approve Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})

    response = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"status": "APPROVED"}
    )
    assert response.status_code == 403


def test_I_rejected_to_pending_resubmit_success():
    """I. REJECTED -> PENDING -> success"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Resubmittable Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{event_id}/reject", headers={"Authorization": f"Bearer {faculty_token}"}, json={"reason": "Fix timing"})

    response = client.post(f"/api/events/{event_id}/resubmit", headers={"Authorization": f"Bearer {club_admin_token}"})
    assert response.status_code == 200
    assert response.json()["status"] == "PENDING_FACULTY_APPROVAL"


def test_J_rejected_to_approved_directly_rejected():
    """J. REJECTED -> APPROVED directly -> HTTP 400/403"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Bypass Reject Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{event_id}/reject", headers={"Authorization": f"Bearer {faculty_token}"}, json={"reason": "Needs changes"})

    response = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "APPROVED"}
    )
    assert response.status_code == 400
    assert "invalid event status transition" in response.json()["detail"].lower()


def test_K_draft_to_approved_directly_rejected():
    """K. DRAFT -> APPROVED directly -> HTTP 400"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Bypass Draft Event")

    response = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "APPROVED"}
    )
    assert response.status_code == 400


def test_L_student_sees_only_approved_events():
    """L. Student sees APPROVED event -> success (DRAFT/PENDING hidden)"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    student_token = get_token("student1@campusflow.edu")

    draft_id = create_test_event(club_admin_token, "Hidden Draft")

    response = client.get("/api/events", headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 200
    event_ids = [e["id"] for e in response.json()]
    assert draft_id not in event_ids


def test_M_N_student_cannot_register_for_draft_or_pending():
    """M & N. Student cannot register for DRAFT or PENDING events -> HTTP 400"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    student_token = get_token("student1@campusflow.edu")

    draft_id = create_test_event(club_admin_token, "Register Draft Test")
    resp_draft = client.post(f"/api/events/{draft_id}/register", headers={"Authorization": f"Bearer {student_token}"})
    assert resp_draft.status_code == 400

    pending_id = create_test_event(club_admin_token, "Register Pending Test")
    client.post(f"/api/events/{pending_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    resp_pending = client.post(f"/api/events/{pending_id}/register", headers={"Authorization": f"Bearer {student_token}"})
    assert resp_pending.status_code == 400


def test_O_student_registers_for_approved_event():
    """O. Student registers for APPROVED event -> success"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")
    student_token = get_token("student1@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Approved Registration Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{event_id}/approve", headers={"Authorization": f"Bearer {faculty_token}"}, json={"status": "APPROVED"})

    response = client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student_token}"})
    assert response.status_code == 201
    assert "registration_id" in response.json()


def test_P_duplicate_registration_returns_409():
    """P. Duplicate registration -> HTTP 409"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")
    student_token = get_token("student1@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Dup Register Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{event_id}/approve", headers={"Authorization": f"Bearer {faculty_token}"}, json={"status": "APPROVED"})

    resp1 = client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student_token}"})
    assert resp1.status_code == 201

    resp2 = client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student_token}"})
    assert resp2.status_code == 409
    assert "already registered" in resp2.json()["detail"].lower()


def test_Q_registration_after_capacity_reached_rejected():
    """Q. Registration after capacity reached -> rejected"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")
    student1_token = get_token("student1@campusflow.edu")
    student2_token = get_token("student2@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Capacity 1 Event", capacity=1)
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{event_id}/approve", headers={"Authorization": f"Bearer {faculty_token}"}, json={"status": "APPROVED"})

    resp1 = client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student1_token}"})
    assert resp1.status_code == 201

    resp2 = client.post(f"/api/events/{event_id}/register", headers={"Authorization": f"Bearer {student2_token}"})
    assert resp2.status_code == 400
    assert "capacity reached" in resp2.json()["detail"].lower()


def test_R_S_completed_and_cancelled_event_cannot_accept_registration():
    """R & S. COMPLETED and CANCELLED event cannot accept registration -> HTTP 400"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")
    student_token = get_token("student1@campusflow.edu")

    # Completed Event
    completed_id = create_test_event(club_admin_token, "Completed Reg Event")
    client.post(f"/api/events/{completed_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{completed_id}/approve", headers={"Authorization": f"Bearer {faculty_token}"}, json={"status": "APPROVED"})
    client.post(f"/api/events/{completed_id}/start", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{completed_id}/complete", headers={"Authorization": f"Bearer {club_admin_token}"})

    resp_comp = client.post(f"/api/events/{completed_id}/register", headers={"Authorization": f"Bearer {student_token}"})
    assert resp_comp.status_code == 400

    # Cancelled Event
    cancelled_id = create_test_event(club_admin_token, "Cancelled Reg Event")
    client.post(f"/api/events/{cancelled_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{cancelled_id}/approve", headers={"Authorization": f"Bearer {faculty_token}"}, json={"status": "APPROVED"})
    client.post(f"/api/events/{cancelled_id}/cancel", headers={"Authorization": f"Bearer {club_admin_token}"})

    resp_canc = client.post(f"/api/events/{cancelled_id}/register", headers={"Authorization": f"Bearer {student_token}"})
    assert resp_canc.status_code == 400


def test_T_U_V_lifecycle_transitions_approved_ongoing_completed_invalid_completed_approved():
    """T, U, V. APPROVED -> ONGOING -> COMPLETED, invalid COMPLETED -> APPROVED"""
    club_admin_token = get_token("clubadmin@campusflow.edu")
    faculty_token = get_token("faculty@campusflow.edu")

    event_id = create_test_event(club_admin_token, "Lifecycle Transition Event")
    client.post(f"/api/events/{event_id}/submit", headers={"Authorization": f"Bearer {club_admin_token}"})
    client.post(f"/api/events/{event_id}/approve", headers={"Authorization": f"Bearer {faculty_token}"}, json={"status": "APPROVED"})

    # T. APPROVED -> ONGOING
    resp_start = client.post(f"/api/events/{event_id}/start", headers={"Authorization": f"Bearer {club_admin_token}"})
    assert resp_start.status_code == 200
    assert resp_start.json()["status"] == "ONGOING"

    # U. ONGOING -> COMPLETED
    resp_comp = client.post(f"/api/events/{event_id}/complete", headers={"Authorization": f"Bearer {club_admin_token}"})
    assert resp_comp.status_code == 200
    assert resp_comp.json()["status"] == "COMPLETED"

    # V. Invalid COMPLETED -> APPROVED
    resp_inv = client.post(
        f"/api/events/{event_id}/approve",
        headers={"Authorization": f"Bearer {faculty_token}"},
        json={"status": "APPROVED"}
    )
    assert resp_inv.status_code == 400


def test_W_audit_logs_created_for_transitions():
    """W. Audit logs are created for transitions"""
    db = SessionLocal()
    logs = db.query(models.AuditLog).filter(models.AuditLog.entity == "events").all()
    db.close()
    actions = [l.action for l in logs]
    
    assert "EVENT_CREATED" in actions
    assert "EVENT_SUBMITTED" in actions
    assert "EVENT_APPROVED" in actions
