import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.database import SessionLocal
from app import models, auth
from app.services import badge_service

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()


def get_token(email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
    assert response.status_code == 200, f"Login failed for {email}: {response.json()}"
    return response.json()["access_token"]


def test_1_get_all_badges():
    """1. GET /api/badges works for authenticated users."""
    token = get_token("student1@campusflow.edu")
    response = client.get("/api/badges", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    badges = response.json()
    assert isinstance(badges, list)
    assert len(badges) >= 2
    badge_names = [b["name"] for b in badges]
    assert "Code Warrior" in badge_names
    assert "Club Leader" in badge_names


def test_2_my_badges_requires_authentication():
    """2. GET /api/badges/my requires authentication (401)."""
    response = client.get("/api/badges/my")
    assert response.status_code == 401


def test_3_student_isolation():
    """3. Student receives only their own badges."""
    db = SessionLocal()
    try:
        # Create a fresh test student with no badges
        iso_student = models.User(
            email="isolation_student@campusflow.edu",
            password_hash=auth.get_password_hash("password123"),
            full_name="Isolation Student",
            system_role="STUDENT",
            ra_number="RA8888888888881",
            is_active=True
        )
        db.add(iso_student)
        db.commit()
    finally:
        db.close()

    token1 = get_token("student1@campusflow.edu")
    token_iso = get_token("isolation_student@campusflow.edu")

    res1 = client.get("/api/badges/my", headers={"Authorization": f"Bearer {token1}"})
    res_iso = client.get("/api/badges/my", headers={"Authorization": f"Bearer {token_iso}"})

    assert res1.status_code == 200
    assert res_iso.status_code == 200

    badges1 = res1.json()
    badges_iso = res_iso.json()

    assert any(b["name"] == "Club Leader" for b in badges1)
    assert len(badges_iso) == 0


def test_4_empty_badge_list():
    """4. Empty badge list returns successfully (200 + [])."""
    db = SessionLocal()
    try:
        empty_student = models.User(
            email="empty_badge_student@campusflow.edu",
            password_hash=auth.get_password_hash("password123"),
            full_name="Empty Badge Student",
            system_role="STUDENT",
            ra_number="RA8888888888882",
            is_active=True
        )
        db.add(empty_student)
        db.commit()
    finally:
        db.close()

    token_empty = get_token("empty_badge_student@campusflow.edu")
    response = client.get("/api/badges/my", headers={"Authorization": f"Bearer {token_empty}"})
    assert response.status_code == 200
    assert response.json() == []


def test_5_code_warrior_not_awarded_on_registration_alone():
    """5. Code Warrior is NOT awarded merely because a student registered for 3 events."""
    db = SessionLocal()
    try:
        test_student = models.User(
            email="reg_only_student@campusflow.edu",
            password_hash=auth.get_password_hash("password123"),
            full_name="Reg Only Student",
            system_role="STUDENT",
            ra_number="RA8888888888883",
            is_active=True
        )
        db.add(test_student)
        db.commit()

        club = db.query(models.Club).first()
        club_admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev1 = models.Event(club_id=club.id, title="Test Ev CW 1", category="Technical", venue="L1", start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2), capacity=50, status="APPROVED", created_by_id=club_admin.id)
        ev2 = models.Event(club_id=club.id, title="Test Ev CW 2", category="Workshop", venue="L2", start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2), capacity=50, status="APPROVED", created_by_id=club_admin.id)
        ev3 = models.Event(club_id=club.id, title="Test Ev CW 3", category="Hackathon", venue="L3", start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2), capacity=50, status="APPROVED", created_by_id=club_admin.id)
        db.add_all([ev1, ev2, ev3])
        db.commit()

        reg1 = models.EventRegistration(event_id=ev1.id, student_id=test_student.id, status="REGISTERED")
        reg2 = models.EventRegistration(event_id=ev2.id, student_id=test_student.id, status="REGISTERED")
        reg3 = models.EventRegistration(event_id=ev3.id, student_id=test_student.id, status="REGISTERED")
        db.add_all([reg1, reg2, reg3])
        db.commit()

        new_badges = badge_service.evaluate_and_award_badges(db, test_student.id)
        assert not any(b.badge.name == "Code Warrior" for b in new_badges if b.badge)
    finally:
        db.close()

    token = get_token("reg_only_student@campusflow.edu")
    res = client.get("/api/badges/my", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert not any(b["name"] == "Code Warrior" for b in res.json())


def test_6_code_warrior_awarded_on_actual_attendance():
    """6. Code Warrior IS awarded when student actually attended 3 qualifying events."""
    db = SessionLocal()
    try:
        att_student = models.User(
            email="attended_student@campusflow.edu",
            password_hash=auth.get_password_hash("password123"),
            full_name="Attended Student",
            system_role="STUDENT",
            ra_number="RA8888888888884",
            is_active=True
        )
        db.add(att_student)
        db.commit()

        club = db.query(models.Club).first()
        club_admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev1 = models.Event(club_id=club.id, title="Att Ev CW 1", category="Technical", venue="L1", start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2), capacity=50, status="APPROVED", created_by_id=club_admin.id)
        ev2 = models.Event(club_id=club.id, title="Att Ev CW 2", category="Workshop", venue="L2", start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2), capacity=50, status="APPROVED", created_by_id=club_admin.id)
        ev3 = models.Event(club_id=club.id, title="Att Ev CW 3", category="Hackathon", venue="L3", start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2), capacity=50, status="APPROVED", created_by_id=club_admin.id)
        db.add_all([ev1, ev2, ev3])
        db.commit()

        att1 = models.Attendance(event_id=ev1.id, student_id=att_student.id, marked_by_id=club_admin.id)
        att2 = models.Attendance(event_id=ev2.id, student_id=att_student.id, marked_by_id=club_admin.id)
        att3 = models.Attendance(event_id=ev3.id, student_id=att_student.id, marked_by_id=club_admin.id)
        db.add_all([att1, att2, att3])
        db.commit()

        new_badges = badge_service.evaluate_and_award_badges(db, att_student.id)
        assert any(b.badge.name == "Code Warrior" for b in new_badges if b.badge)
    finally:
        db.close()

    token = get_token("attended_student@campusflow.edu")
    res = client.get("/api/badges/my", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert any(b["name"] == "Code Warrior" for b in res.json())


def test_7_same_event_not_counted_multiple_times():
    """7. Same event cannot be counted multiple times for Code Warrior."""
    db = SessionLocal()
    try:
        new_student = models.User(
            email="unique_student_test7@campusflow.edu",
            password_hash=auth.get_password_hash("password123"),
            full_name="Unique Student 7",
            system_role="STUDENT",
            ra_number="RA9999999999997",
            is_active=True
        )
        db.add(new_student)
        db.commit()

        club_admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()
        event = db.query(models.Event).first()

        att1 = models.Attendance(event_id=event.id, student_id=new_student.id, marked_by_id=club_admin.id)
        db.add(att1)
        db.commit()

        new_badges = badge_service.evaluate_and_award_badges(db, new_student.id)
        assert not any(b.badge.name == "Code Warrior" for b in new_badges if b.badge)
    finally:
        db.close()


def test_8_code_warrior_cannot_be_awarded_twice():
    """8. Code Warrior cannot be awarded twice to the same student."""
    db = SessionLocal()
    try:
        att_student = db.query(models.User).filter(models.User.email == "attended_student@campusflow.edu").first()
        code_warrior = db.query(models.Badge).filter(models.Badge.name == "Code Warrior").first()

        cw_count = db.query(models.StudentBadge).filter(
            models.StudentBadge.student_id == att_student.id,
            models.StudentBadge.badge_id == code_warrior.id
        ).count()
        assert cw_count == 1

        new_badges = badge_service.evaluate_and_award_badges(db, att_student.id)
        assert len(new_badges) == 0

        cw_count_after = db.query(models.StudentBadge).filter(
            models.StudentBadge.student_id == att_student.id,
            models.StudentBadge.badge_id == code_warrior.id
        ).count()
        assert cw_count_after == 1
    finally:
        db.close()


def test_9_club_leader_awarded_for_leadership_role():
    """9. Club Leader is awarded when student has qualifying dynamic leadership role."""
    token1 = get_token("student1@campusflow.edu")
    res = client.get("/api/badges/my", headers={"Authorization": f"Bearer {token1}"})
    assert res.status_code == 200
    badges = res.json()
    assert any(b["name"] == "Club Leader" for b in badges)


def test_10_club_leader_not_awarded_to_ordinary_student():
    """10. Club Leader is not awarded to an ordinary student without leadership role."""
    db = SessionLocal()
    try:
        student3 = models.User(
            email="ordinary_student_test10@campusflow.edu",
            password_hash=auth.get_password_hash("password123"),
            full_name="Ordinary Student 10",
            system_role="STUDENT",
            ra_number="RA9999999999910",
            is_active=True
        )
        db.add(student3)
        db.commit()

        club = db.query(models.Club).first()
        member = models.ClubMember(club_id=club.id, user_id=student3.id, role_name="MEMBER", status="ACTIVE")
        db.add(member)
        db.commit()

        new_badges = badge_service.evaluate_and_award_badges(db, student3.id)
        assert not any(b.badge.name == "Club Leader" for b in new_badges if b.badge)
    finally:
        db.close()


def test_11_badge_awarding_is_idempotent():
    """11. Badge awarding is idempotent."""
    db = SessionLocal()
    try:
        student1 = db.query(models.User).filter(models.User.email == "student1@campusflow.edu").first()
        initial_count = db.query(models.StudentBadge).filter(models.StudentBadge.student_id == student1.id).count()

        for _ in range(5):
            badge_service.evaluate_and_award_badges(db, student1.id)

        final_count = db.query(models.StudentBadge).filter(models.StudentBadge.student_id == student1.id).count()
        assert initial_count == final_count
    finally:
        db.close()


def test_12_unauthorized_users_cannot_access_other_student_badges():
    """12. Non-student roles or unauthorized attempts to access /api/badges/my fail (403)."""
    faculty_token = get_token("faculty@campusflow.edu")
    admin_token = get_token("admin@campusflow.edu")

    for token in [faculty_token, admin_token]:
        res = client.get("/api/badges/my", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403


def test_13_existing_badge_records_remain_valid():
    """13. Existing badge definitions remain valid in database."""
    token = get_token("student1@campusflow.edu")
    res = client.get("/api/badges", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    badge_dict = {b["name"]: b for b in res.json()}
    assert "Code Warrior" in badge_dict
    assert "Club Leader" in badge_dict
    assert badge_dict["Code Warrior"]["icon"] == "Terminal"
    assert badge_dict["Club Leader"]["icon"] == "Award"
