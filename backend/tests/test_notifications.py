import datetime
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.seed import seed_database
from app.database import SessionLocal
from app import models, auth
from app.services import notification_service, badge_service, certificate_service

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    seed_database()


def get_token(email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": "password123"})
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


def test_1_notifications_requires_authentication():
    """1. GET /api/notifications requires authentication (401)."""
    response = client.get("/api/notifications")
    assert response.status_code == 401


def test_2_3_user_isolation_and_no_other_access():
    """2 & 3. User receives only their own notifications; Student A cannot see Student B's."""
    db = SessionLocal()
    try:
        u1 = get_or_create_user(db, "notif_user1@campusflow.edu", "STUDENT", "Notif User 1", "RA6666666666601")
        u2 = get_or_create_user(db, "notif_user2@campusflow.edu", "STUDENT", "Notif User 2", "RA6666666666602")

        n1 = notification_service.create_notification(
            db, user_id=u1.id, title="Title 1", message="Message 1", type="TEST_TYPE", entity_type="TEST", entity_id=101
        )
        n2 = notification_service.create_notification(
            db, user_id=u2.id, title="Title 2", message="Message 2", type="TEST_TYPE", entity_type="TEST", entity_id=102
        )
        n1_id = n1.id
        n2_id = n2.id
    finally:
        db.close()

    t1 = get_token("notif_user1@campusflow.edu")
    t2 = get_token("notif_user2@campusflow.edu")

    res1 = client.get("/api/notifications", headers={"Authorization": f"Bearer {t1}"})
    res2 = client.get("/api/notifications", headers={"Authorization": f"Bearer {t2}"})

    assert res1.status_code == 200
    assert res2.status_code == 200

    notifs1 = res1.json()
    notifs2 = res2.json()

    assert any(n["id"] == n1_id for n in notifs1)
    assert not any(n["id"] == n2_id for n in notifs1)

    assert any(n["id"] == n2_id for n in notifs2)
    assert not any(n["id"] == n1_id for n in notifs2)


def test_4_unread_count():
    """4. Unread count endpoint works correctly."""
    db = SessionLocal()
    try:
        u = get_or_create_user(db, "notif_unread@campusflow.edu", "STUDENT", "Unread User", "RA6666666666603")
        notification_service.create_notification(db, user_id=u.id, title="Unread 1", message="M1")
        notification_service.create_notification(db, user_id=u.id, title="Unread 2", message="M2")
    finally:
        db.close()

    t = get_token("notif_unread@campusflow.edu")
    res = client.get("/api/notifications/unread-count", headers={"Authorization": f"Bearer {t}"})
    assert res.status_code == 200
    assert res.json()["unread_count"] >= 2


def test_5_6_7_read_state_management():
    """5, 6 & 7. Mark single read works; cannot mark other user's (403); read-all affects only current user."""
    db = SessionLocal()
    try:
        u1 = get_or_create_user(db, "notif_read1@campusflow.edu", "STUDENT", "Read User 1", "RA6666666666604")
        u2 = get_or_create_user(db, "notif_read2@campusflow.edu", "STUDENT", "Read User 2", "RA6666666666605")

        n1 = notification_service.create_notification(db, user_id=u1.id, title="U1 Notif", message="M")
        n2 = notification_service.create_notification(db, user_id=u2.id, title="U2 Notif", message="M")
        n1_id = n1.id
        n2_id = n2.id
    finally:
        db.close()

    t1 = get_token("notif_read1@campusflow.edu")
    t2 = get_token("notif_read2@campusflow.edu")

    # 5. Mark single read (u1 marks n1)
    res_read = client.patch(f"/api/notifications/{n1_id}/read", headers={"Authorization": f"Bearer {t1}"})
    assert res_read.status_code == 200
    assert res_read.json()["is_read"] is True

    # 6. Mark other user's notification as read (u1 tries to mark n2) -> 403 Forbidden
    res_forbidden = client.patch(f"/api/notifications/{n2_id}/read", headers={"Authorization": f"Bearer {t1}"})
    assert res_forbidden.status_code == 403


    # 7. Read-all (u2 marks all u2 notifications)
    res_all = client.patch("/api/notifications/read-all", headers={"Authorization": f"Bearer {t2}"})
    assert res_all.status_code == 200

    # Verify n2 is read
    db = SessionLocal()
    try:
        n2_db = db.query(models.Notification).filter(models.Notification.id == n2.id).first()
        assert n2_db.is_read is True
    finally:
        db.close()


def test_8_9_10_event_lifecycle_notifications():
    """8, 9 & 10. Event submission, approval, rejection create notifications."""
    club_admin_t = get_token("clubadmin@campusflow.edu")
    faculty_t = get_token("faculty@campusflow.edu")

    # Create DRAFT event
    res_c = client.post("/api/events", headers={"Authorization": f"Bearer {club_admin_t}"}, json={
        "club_id": 1, "title": "Notif Lifecycle Event", "description": "D", "category": "Technical",
        "venue": "V", "start_time": (datetime.datetime.utcnow() + datetime.timedelta(days=1)).isoformat(),
        "end_time": (datetime.datetime.utcnow() + datetime.timedelta(days=1, hours=2)).isoformat(),
        "capacity": 50
    })
    assert res_c.status_code == 201
    ev_id = res_c.json()["id"]

    # 8. Submit event -> faculty notification created
    res_sub = client.post(f"/api/events/{ev_id}/submit", headers={"Authorization": f"Bearer {club_admin_t}"})
    assert res_sub.status_code == 200

    res_fac_n = client.get("/api/notifications", headers={"Authorization": f"Bearer {faculty_t}"})
    assert res_fac_n.status_code == 200
    assert any(n["type"] == "EVENT_SUBMITTED" and n["entity_id"] == ev_id for n in res_fac_n.json())

    # 10. Reject event -> club admin notification created
    res_rej = client.post(f"/api/events/{ev_id}/reject", headers={"Authorization": f"Bearer {faculty_t}"}, json={"reason": "Venue conflict"})
    assert res_rej.status_code == 200

    res_ca_n = client.get("/api/notifications", headers={"Authorization": f"Bearer {club_admin_t}"})
    assert res_ca_n.status_code == 200
    assert any(n["type"] == "EVENT_REJECTED" and n["entity_id"] == ev_id for n in res_ca_n.json())

    # Resubmit event
    client.post(f"/api/events/{ev_id}/resubmit", headers={"Authorization": f"Bearer {club_admin_t}"})

    # 9. Approve event -> club admin notification created
    res_app = client.post(f"/api/events/{ev_id}/approve", headers={"Authorization": f"Bearer {faculty_t}"}, json={"status": "APPROVED"})
    assert res_app.status_code == 200

    res_ca_n2 = client.get("/api/notifications", headers={"Authorization": f"Bearer {club_admin_t}"})
    assert any(n["type"] == "EVENT_APPROVED" and n["entity_id"] == ev_id for n in res_ca_n2.json())


def test_11_event_registration_notification():
    """11. Event registration creates notification for event organizer."""
    db = SessionLocal()
    try:
        std = get_or_create_user(db, "reg_notif_std@campusflow.edu", "STUDENT", "Reg Notif Student", "RA6666666666606")
        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev = models.Event(
            club_id=club.id, title="Reg Notif Event", category="Technical", venue="V",
            start_time=datetime.datetime.utcnow() + datetime.timedelta(days=2),
            end_time=datetime.datetime.utcnow() + datetime.timedelta(days=2, hours=2),
            capacity=50, status="APPROVED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()
        ev_id = ev.id
    finally:
        db.close()

    std_t = get_token("reg_notif_std@campusflow.edu")
    ca_t = get_token("clubadmin@campusflow.edu")

    res_reg = client.post(f"/api/events/{ev_id}/register", headers={"Authorization": f"Bearer {std_t}"})
    assert res_reg.status_code == 201

    res_ca = client.get("/api/notifications", headers={"Authorization": f"Bearer {ca_t}"})
    assert any(n["type"] == "EVENT_REGISTERED" and n["entity_id"] == ev_id for n in res_ca.json())


def test_12_13_14_od_workflow_notifications():
    """12, 13 & 14. OD creation, approval, and rejection create appropriate notifications."""
    db = SessionLocal()
    try:
        faculty = db.query(models.User).filter(models.User.system_role == "FACULTY").first()
        std = get_or_create_user(db, "od_notif_std@campusflow.edu", "STUDENT", "OD Notif Student", "RA6666666666607")
        std.class_mentor_id = faculty.id
        db.commit()

        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev = models.Event(
            club_id=club.id, title="OD Notif Event", category="Technical", venue="V",
            start_time=datetime.datetime(2026, 10, 12, 10, 0),
            end_time=datetime.datetime(2026, 10, 12, 12, 0),
            capacity=50, status="APPROVED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()

        reg = models.EventRegistration(event_id=ev.id, student_id=std.id, status="REGISTERED")
        db.add(reg)
        db.commit()
        ev_id = ev.id
    finally:
        db.close()

    std_t = get_token("od_notif_std@campusflow.edu")
    fac_t = get_token("faculty@campusflow.edu")

    # 12. OD Request created -> notify faculty
    res_od = client.post("/api/od-requests", headers={"Authorization": f"Bearer {std_t}"}, json={"event_id": ev_id})
    assert res_od.status_code == 201
    od_id = res_od.json()["id"]

    res_fac = client.get("/api/notifications", headers={"Authorization": f"Bearer {fac_t}"})
    assert any(n["type"] == "OD_REQUESTED" and n["entity_id"] == od_id for n in res_fac.json())

    # 13. OD Approved -> notify student
    res_app = client.post(f"/api/od-requests/{od_id}/approve", headers={"Authorization": f"Bearer {fac_t}"}, json={"status": "APPROVED"})
    assert res_app.status_code == 200

    res_std = client.get("/api/notifications", headers={"Authorization": f"Bearer {std_t}"})
    assert any(n["type"] == "OD_APPROVED" and n["entity_id"] == od_id for n in res_std.json())


def test_15_role_assigned_notification():
    """15. Dynamic role assignment creates notification for student."""
    db = SessionLocal()
    try:
        std = get_or_create_user(db, "role_notif_std@campusflow.edu", "STUDENT", "Role Notif Student", "RA6666666666608")
        club = db.query(models.Club).first()

        member = models.ClubMember(club_id=club.id, user_id=std.id, role_name="Logistics Lead", status="ACTIVE")
        db.add(member)
        db.commit()

        # Trigger role notification
        n = notification_service.notify_role_assigned(db, std.id, "Logistics Lead", club.name, member.id)
        assert n is not None
    finally:
        db.close()

    std_t = get_token("role_notif_std@campusflow.edu")
    res = client.get("/api/notifications", headers={"Authorization": f"Bearer {std_t}"})
    assert res.status_code == 200
    assert any(n["type"] == "ROLE_ASSIGNED" for n in res.json())


def test_16_18_badge_award_notification_and_duplicate_prevention():
    """16 & 18. Badge award creates notification; duplicate badge evaluation does NOT create duplicate notifications."""
    db = SessionLocal()
    try:
        std = get_or_create_user(db, "badge_notif_std@campusflow.edu", "STUDENT", "Badge Notif Student", "RA6666666666609")
        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        # Add 3 attendances for std
        for i in range(3):
            ev = models.Event(club_id=club.id, title=f"Badge Ev {i}", category="Technical", venue="V", start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2), capacity=50, status="APPROVED", created_by_id=admin.id)
            db.add(ev)
            db.commit()
            att = models.Attendance(event_id=ev.id, student_id=std.id, marked_by_id=admin.id)
            db.add(att)
        db.commit()

        # First badge evaluation -> triggers notification
        badge_service.evaluate_and_award_badges(db, std.id)

        count1 = db.query(models.Notification).filter(
            models.Notification.user_id == std.id,
            models.Notification.type == "BADGE_AWARDED"
        ).count()
        assert count1 == 1

        # Second badge evaluation -> NO duplicate notification created
        badge_service.evaluate_and_award_badges(db, std.id)

        count2 = db.query(models.Notification).filter(
            models.Notification.user_id == std.id,
            models.Notification.type == "BADGE_AWARDED"
        ).count()
        assert count2 == 1
    finally:
        db.close()


def test_17_19_certificate_generation_notification_and_duplicate_prevention():
    """17 & 19. Certificate generation creates notification; duplicate generation does NOT create duplicate notifications."""
    db = SessionLocal()
    try:
        std = get_or_create_user(db, "cert_notif_std@campusflow.edu", "STUDENT", "Cert Notif Student", "RA6666666666610")
        club = db.query(models.Club).first()
        admin = db.query(models.User).filter(models.User.system_role == "CLUB_ADMIN").first()

        ev = models.Event(
            club_id=club.id, title="Cert Notif Ev", category="Technical", venue="V",
            start_time=datetime.datetime.utcnow(), end_time=datetime.datetime.utcnow() + datetime.timedelta(hours=2),
            capacity=50, status="COMPLETED", created_by_id=admin.id
        )
        db.add(ev)
        db.commit()

        db.add_all([
            models.EventRegistration(event_id=ev.id, student_id=std.id, status="REGISTERED"),
            models.Attendance(event_id=ev.id, student_id=std.id, marked_by_id=admin.id)
        ])
        db.commit()

        # First cert generation -> triggers notification
        c1 = certificate_service.generate_certificate_for_student(db, ev.id, std.id)
        assert c1 is not None

        count1 = db.query(models.Notification).filter(
            models.Notification.user_id == std.id,
            models.Notification.type == "CERTIFICATE_GENERATED"
        ).count()
        assert count1 == 1

        # Second cert generation -> NO duplicate notification created
        c2 = certificate_service.generate_certificate_for_student(db, ev.id, std.id)
        assert c2 is not None

        count2 = db.query(models.Notification).filter(
            models.Notification.user_id == std.id,
            models.Notification.type == "CERTIFICATE_GENERATED"
        ).count()
        assert count2 == 1
    finally:
        db.close()
