import random
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()


def test_valid_student_registration():
    """1. Valid student registration succeeds."""
    rand = random.randint(10000, 99999)
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"verif.student{rand}@campusflow.edu",
            "password": "password123",
            "full_name": "Verification Student",
            "system_role": "STUDENT",
            "ra_number": f"RA23110030{rand}",
            "department": "Information Technology"
        }
    )
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.json()}"
    data = response.json()
    assert "access_token" in data
    assert "user" in data
    assert data["user"]["email"] == f"verif.student{rand}@campusflow.edu"
    assert data["user"]["ra_number"] == f"RA23110030{rand}"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]


def test_invalid_email_format():
    """2. Invalid email format returns HTTP 422."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "invalid-email-format",
            "password": "password123",
            "full_name": "Invalid Email User",
            "system_role": "STUDENT",
            "ra_number": "RA2311003010088",
            "department": "CS"
        }
    )
    assert response.status_code == 422


def test_missing_student_ra_number():
    """3. Missing student RA number returns HTTP 400."""
    rand = random.randint(10000, 99999)
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"nora.{rand}@campusflow.edu",
            "password": "password123",
            "full_name": "No RA Student",
            "system_role": "STUDENT",
            "ra_number": None,
            "department": "CS"
        }
    )
    assert response.status_code == 400
    assert "ra number is mandatory" in response.json()["detail"].lower()


def test_invalid_ra_format():
    """4. Invalid RA format returns HTTP 422."""
    rand = random.randint(10000, 99999)
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"badra.{rand}@campusflow.edu",
            "password": "password123",
            "full_name": "Bad RA Student",
            "system_role": "STUDENT",
            "ra_number": "RA23110030100@9",
            "department": "CS"
        }
    )
    assert response.status_code == 422


def test_invalid_ra_length():
    """5. Invalid RA length returns HTTP 422."""
    rand = random.randint(10000, 99999)
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"shortra.{rand}@campusflow.edu",
            "password": "password123",
            "full_name": "Short RA Student",
            "system_role": "STUDENT",
            "ra_number": "RA123",
            "department": "CS"
        }
    )
    assert response.status_code == 422


def test_duplicate_email_registration():
    """6. Duplicate email returns HTTP 400."""
    rand1 = random.randint(10000, 99999)
    rand2 = random.randint(10000, 99999)
    email = f"dupemail.{rand1}@campusflow.edu"
    ra1 = f"RA23110030{rand1}"
    ra2 = f"RA23110030{rand2}"

    # Register student first
    resp1 = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "Original Student",
            "system_role": "STUDENT",
            "ra_number": ra1,
            "department": "CS"
        }
    )
    assert resp1.status_code == 201

    # Attempt duplicate email
    response = client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": "password123",
            "full_name": "Duplicate Student",
            "system_role": "STUDENT",
            "ra_number": ra2,
            "department": "CS"
        }
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_duplicate_ra_registration():
    """7. Duplicate RA number returns HTTP 400."""
    rand1 = random.randint(10000, 99999)
    rand2 = random.randint(10000, 99999)
    ra = f"RA23110030{rand1}"
    email1 = f"dupra1.{rand1}@campusflow.edu"
    email2 = f"dupra2.{rand2}@campusflow.edu"

    # Register student first
    resp1 = client.post(
        "/api/auth/register",
        json={
            "email": email1,
            "password": "password123",
            "full_name": "Original RA Student",
            "system_role": "STUDENT",
            "ra_number": ra,
            "department": "CS"
        }
    )
    assert resp1.status_code == 201

    # Attempt duplicate RA
    response = client.post(
        "/api/auth/register",
        json={
            "email": email2,
            "password": "password123",
            "full_name": "Different Email Student",
            "system_role": "STUDENT",
            "ra_number": ra,
            "department": "CS"
        }
    )
    assert response.status_code == 400
    assert "ra number is already registered" in response.json()["detail"].lower()


def test_valid_non_student_registration():
    """8. Valid non-student registration succeeds."""
    rand = random.randint(10000, 99999)
    response = client.post(
        "/api/auth/register",
        json={
            "email": f"faculty.{rand}@campusflow.edu",
            "password": "password123",
            "full_name": "Dr. New Faculty",
            "system_role": "FACULTY",
            "ra_number": None,
            "department": "Electrical Engineering"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["system_role"] == "FACULTY"
    assert data["user"]["ra_number"] is None
