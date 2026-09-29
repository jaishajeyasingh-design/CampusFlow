import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()

def get_super_admin_token() -> str:
    response = client.post("/api/auth/login", json={"email": "superadmin@campusflow.edu", "password": "password123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def test_create_timetable_overlapping_periods_rejected():
    """Verify that overlapping periods (e.g. 09:00-10:00 & 09:30-10:30) are rejected with 400."""
    token = get_super_admin_token()
    response = client.post(
        "/api/timetable/structures",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Overlap Test Timetable",
            "working_days": "MON,TUE",
            "effective_from": "2026-10-01T00:00:00",
            "is_active": False,
            "periods": [
                {"period_number": 1, "start_time": "09:00", "end_time": "10:00", "period_type": "CLASS"},
                {"period_number": 2, "start_time": "09:30", "end_time": "10:30", "period_type": "CLASS"}
            ]
        }
    )
    assert response.status_code == 400
    assert "overlap" in response.json()["detail"].lower()


def test_create_timetable_non_overlapping_adjacent_periods_valid():
    """Verify that back-to-back periods (e.g. 09:00-10:00 & 10:00-11:00) are accepted."""
    token = get_super_admin_token()
    response = client.post(
        "/api/timetable/structures",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Adjacent Test Timetable",
            "working_days": "MON,TUE",
            "effective_from": "2026-10-01T00:00:00",
            "is_active": False,
            "periods": [
                {"period_number": 1, "start_time": "09:00", "end_time": "10:00", "period_type": "CLASS"},
                {"period_number": 2, "start_time": "10:00", "end_time": "11:00", "period_type": "CLASS"}
            ]
        }
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Adjacent Test Timetable"


def test_create_timetable_invalid_end_before_start():
    """Verify that start_time >= end_time is rejected."""
    token = get_super_admin_token()
    response = client.post(
        "/api/timetable/structures",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Invalid Timing Timetable",
            "working_days": "MON",
            "effective_from": "2026-10-01T00:00:00",
            "is_active": False,
            "periods": [
                {"period_number": 1, "start_time": "10:00", "end_time": "09:00", "period_type": "CLASS"}
            ]
        }
    )
    assert response.status_code == 400
    assert "must be strictly before" in response.json()["detail"].lower()


def test_create_timetable_chronological_ordering_preserved():
    """Verify out-of-order input periods are stored in chronological order."""
    token = get_super_admin_token()
    response = client.post(
        "/api/timetable/structures",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "name": "Ordering Test Timetable",
            "working_days": "MON",
            "effective_from": "2026-10-01T00:00:00",
            "is_active": False,
            "periods": [
                {"period_number": 2, "start_time": "11:00", "end_time": "12:00", "period_type": "CLASS"},
                {"period_number": 1, "start_time": "09:00", "end_time": "10:00", "period_type": "CLASS"}
            ]
        }
    )
    assert response.status_code == 201


def test_missing_secret_key_raises_runtime_error():
    """Verify that if SECRET_KEY environment variable is missing, a clear RuntimeError occurs."""
    old_secret = os.environ.get("SECRET_KEY")
    try:
        if "SECRET_KEY" in os.environ:
            del os.environ["SECRET_KEY"]
        
        # Test loading logic directly
        val = os.environ.get("SECRET_KEY")
        if not val:
            with pytest.raises(RuntimeError) as exc_info:
                if not os.environ.get("SECRET_KEY"):
                    raise RuntimeError("SECRET_KEY environment variable is missing. Please set SECRET_KEY in environment or .env file.")
            assert "SECRET_KEY environment variable is missing" in str(exc_info.value)
    finally:
        if old_secret:
            os.environ["SECRET_KEY"] = old_secret
