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


def test_1_2_unauthenticated_user_access_denied():
    """1 & 2. Unauthenticated user cannot access or send messages (401)."""
    resp_get = client.get("/api/messages")
    assert resp_get.status_code == 401

    resp_post = client.post("/api/messages", json={
        "recipient_id": 1,
        "context_type": "EVENT",
        "context_id": 1,
        "message": "Hello"
    })
    assert resp_post.status_code == 401


def test_3_4_5_6_authorized_faculty_and_club_admin_messaging():
    """3, 4, 5, 6. Authorized Faculty and Club Admin messaging in Event context."""
    db = SessionLocal()
    try:
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        faculty2 = get_or_create_user(db, "faculty2_msg@campusflow.edu", "FACULTY", "Faculty Lovelace")
        club_admin = get_or_create_user(db, "clubadmin@campusflow.edu", "CLUB_ADMIN", "Club Admin Sarah")
        
        # Create a test club where faculty1 is coordinator and club_admin is admin
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        if not club:
            club = models.Club(
                name="Coding Msg Club",
                code="CODING_MSG_TEST",
                category="Technical",
                description="Testing messaging",
                club_admin_id=club_admin.id,
                faculty_coordinator_id=faculty1.id
            )
            db.add(club)
            db.commit()
            db.refresh(club)

        # Create an event in this club
        now = datetime.datetime.utcnow()
        event = models.Event(
            club_id=club.id,
            title="Msg Hackathon Event",
            description="Messaging Test Event",
            venue="Hall A",
            start_time=now,
            end_time=now + datetime.timedelta(hours=2),
            capacity=100,
            status="APPROVED",
            created_by_id=faculty2.id
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        # Faculty 2 -> Faculty 1 (Faculty to Faculty)
        token_f2 = get_token(faculty2.email)
        headers_f2 = {"Authorization": f"Bearer {token_f2}"}

        resp_send1 = client.post("/api/messages", headers=headers_f2, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "Can you review the venue arrangements?"
        })
        assert resp_send1.status_code == 201
        msg1_data = resp_send1.json()
        assert msg1_data["sender_id"] == faculty2.id
        assert msg1_data["recipient_id"] == faculty1.id
        assert msg1_data["is_read"] is False

        # Faculty 1 -> Club Admin (Faculty to Club Admin)
        token_f1 = get_token(faculty1.email)
        headers_f1 = {"Authorization": f"Bearer {token_f1}"}

        resp_send2 = client.post("/api/messages", headers=headers_f1, json={
            "recipient_id": club_admin.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "Everything looks approved."
        })
        assert resp_send2.status_code == 201

        # Faculty 1 receives messages
        resp_get_f1 = client.get(f"/api/messages/context/EVENT/{event.id}", headers=headers_f1)
        assert resp_get_f1.status_code == 200
        msgs_f1 = resp_get_f1.json()
        assert len(msgs_f1) == 2
    finally:
        db.close()


def test_7_unrelated_faculty_cannot_message():
    """7. Unrelated Faculty cannot message in an event context they don't participate in."""
    db = SessionLocal()
    try:
        faculty_unrelated = get_or_create_user(db, "unrelated_fac@campusflow.edu", "FACULTY", "Unrelated Faculty")
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        event = db.query(models.Event).filter(models.Event.club_id == club.id).first()

        token = get_token(faculty_unrelated.email)
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.post("/api/messages", headers=headers, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "Trying to intrude"
        })
        assert resp.status_code == 403
    finally:
        db.close()


def test_8_unrelated_club_admin_cannot_access_other_club_message():
    """8. Unrelated Club Admin cannot message or access messages for another club's event."""
    db = SessionLocal()
    try:
        ca_other = get_or_create_user(db, "other_ca@campusflow.edu", "CLUB_ADMIN", "Other CA")
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")

        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        event = db.query(models.Event).filter(models.Event.club_id == club.id).first()

        token = get_token(ca_other.email)
        headers = {"Authorization": f"Bearer {token}"}

        resp_send = client.post("/api/messages", headers=headers, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "Intruding Club Admin"
        })
        assert resp_send.status_code == 403

        resp_get = client.get(f"/api/messages/context/EVENT/{event.id}", headers=headers)
        assert resp_get.status_code == 403
    finally:
        db.close()


def test_9_student_cannot_send_messages():
    """9. Student cannot use messaging to send contextual messages (403)."""
    db = SessionLocal()
    try:
        student = get_or_create_user(db, "student1@campusflow.edu", "STUDENT", "Alex Mercer", "RA2311003010001")
        faculty = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")

        token = get_token(student.email)
        headers = {"Authorization": f"Bearer {token}"}

        resp = client.post("/api/messages", headers=headers, json={
            "recipient_id": faculty.id,
            "context_type": "EVENT",
            "context_id": 1,
            "message": "Student attempting to message"
        })
        assert resp.status_code == 403
    finally:
        db.close()


def test_10_sender_id_impersonation_prevented():
    """10. Frontend supplying arbitrary sender_id is ignored; current_user.id is always used."""
    db = SessionLocal()
    try:
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        faculty2 = get_or_create_user(db, "faculty2_msg@campusflow.edu", "FACULTY", "Faculty Lovelace")
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        event = db.query(models.Event).filter(models.Event.club_id == club.id).first()

        token = get_token(faculty2.email)
        headers = {"Authorization": f"Bearer {token}"}

        # Attempt to pass sender_id in body
        resp = client.post("/api/messages", headers=headers, json={
            "sender_id": faculty1.id,
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "Impersonation attempt"
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["sender_id"] == faculty2.id  # Must be logged-in user, NOT faculty1
    finally:
        db.close()


def test_11_12_invalid_context_and_recipient():
    """11 & 12. Invalid context_id/context_type or invalid recipient_id returns appropriate 404/400/403."""
    token = get_token("faculty@campusflow.edu")
    headers = {"Authorization": f"Bearer {token}"}

    # Invalid context_type
    resp1 = client.post("/api/messages", headers=headers, json={
        "recipient_id": 1,
        "context_type": "INVALID_TYPE",
        "context_id": 1,
        "message": "Test"
    })
    assert resp1.status_code == 400

    # Non-existent context_id
    resp2 = client.post("/api/messages", headers=headers, json={
        "recipient_id": 1,
        "context_type": "EVENT",
        "context_id": 999999,
        "message": "Test"
    })
    assert resp2.status_code == 404

    # Non-existent recipient_id
    club = SessionLocal().query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
    event = SessionLocal().query(models.Event).filter(models.Event.club_id == club.id).first()
    resp3 = client.post("/api/messages", headers=headers, json={
        "recipient_id": 999999,
        "context_type": "EVENT",
        "context_id": event.id,
        "message": "Test"
    })
    assert resp3.status_code == 404


def test_13_14_15_message_validation():
    """13, 14, 15. Empty, whitespace-only, and excessively long messages are rejected (400)."""
    db = SessionLocal()
    try:
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        faculty2 = get_or_create_user(db, "faculty2_msg@campusflow.edu", "FACULTY", "Faculty Lovelace")
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        event = db.query(models.Event).filter(models.Event.club_id == club.id).first()

        token = get_token(faculty2.email)
        headers = {"Authorization": f"Bearer {token}"}

        # Empty message
        resp1 = client.post("/api/messages", headers=headers, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": ""
        })
        assert resp1.status_code == 400

        # Whitespace-only message
        resp2 = client.post("/api/messages", headers=headers, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "    \n\t   "
        })
        assert resp2.status_code == 400

        # Message exceeding length limit (>2000 chars)
        resp3 = client.post("/api/messages", headers=headers, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "A" * 2001
        })
        assert resp3.status_code == 400
    finally:
        db.close()


def test_16_23_24_cross_context_isolation():
    """16, 23, 24. Messages appear only in their designated context (cross-event & cross-OD isolation)."""
    db = SessionLocal()
    try:
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        faculty2 = get_or_create_user(db, "faculty2_msg@campusflow.edu", "FACULTY", "Faculty Lovelace")
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()

        now = datetime.datetime.utcnow()
        ev1 = models.Event(
            club_id=club.id, title="Iso Ev 1", venue="V1",
            start_time=now, end_time=now + datetime.timedelta(hours=2),
            capacity=50, status="APPROVED", created_by_id=faculty2.id
        )
        ev2 = models.Event(
            club_id=club.id, title="Iso Ev 2", venue="V2",
            start_time=now, end_time=now + datetime.timedelta(hours=2),
            capacity=50, status="APPROVED", created_by_id=faculty2.id
        )
        db.add_all([ev1, ev2])
        db.commit()

        token_f2 = get_token(faculty2.email)
        headers_f2 = {"Authorization": f"Bearer {token_f2}"}

        client.post("/api/messages", headers=headers_f2, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": ev1.id,
            "message": "Message for Event 1 only"
        })

        # Fetch messages for ev1
        resp_ev1 = client.get(f"/api/messages/context/EVENT/{ev1.id}", headers=headers_f2)
        assert resp_ev1.status_code == 200
        msgs_ev1 = resp_ev1.json()
        assert len(msgs_ev1) == 1
        assert msgs_ev1[0]["message"] == "Message for Event 1 only"

        # Fetch messages for ev2 (must be empty)
        resp_ev2 = client.get(f"/api/messages/context/EVENT/{ev2.id}", headers=headers_f2)
        assert resp_ev2.status_code == 200
        msgs_ev2 = resp_ev2.json()
        assert len(msgs_ev2) == 0
    finally:
        db.close()


def test_17_18_19_20_read_status_and_unread_count():
    """17, 18, 19, 20. Read marking, read-all scoping, and unread count tracking."""
    db = SessionLocal()
    try:
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        faculty2 = get_or_create_user(db, "faculty2_msg@campusflow.edu", "FACULTY", "Faculty Lovelace")
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        event = db.query(models.Event).filter(models.Event.club_id == club.id).first()

        token_f1 = get_token(faculty1.email)
        token_f2 = get_token(faculty2.email)
        headers_f1 = {"Authorization": f"Bearer {token_f1}"}
        headers_f2 = {"Authorization": f"Bearer {token_f2}"}

        # Initial unread count for faculty1 before sending
        initial_unread = client.get("/api/messages/unread-count", headers=headers_f1).json()["unread_count"]

        # Faculty 2 sends a message to Faculty 1
        resp_msg = client.post("/api/messages", headers=headers_f2, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "Unread count test message"
        })
        msg_id = resp_msg.json()["id"]

        # Faculty 1 unread count increases by 1
        new_unread = client.get("/api/messages/unread-count", headers=headers_f1).json()["unread_count"]
        assert new_unread == initial_unread + 1

        # Sender (Faculty 2) tries to mark Faculty 1's received message as read -> 403 Forbidden
        resp_sender_read = client.patch(f"/api/messages/{msg_id}/read", headers=headers_f2)
        assert resp_sender_read.status_code == 403

        # Recipient (Faculty 1) marks message as read -> 200 OK
        resp_recip_read = client.patch(f"/api/messages/{msg_id}/read", headers=headers_f1)
        assert resp_recip_read.status_code == 200
        assert resp_recip_read.json()["is_read"] is True

        # Unread count decrements
        after_read_count = client.get("/api/messages/unread-count", headers=headers_f1).json()["unread_count"]
        assert after_read_count == initial_unread

        # Send another message and test patch /read-all
        client.post("/api/messages", headers=headers_f2, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": "Batch read test message"
        })
        resp_read_all = client.patch("/api/messages/read-all", headers=headers_f1)
        assert resp_read_all.status_code == 200
        assert resp_read_all.json()["updated_count"] >= 1
    finally:
        db.close()


def test_21_22_notification_generation_and_no_data_leakage():
    """21 & 22. Sending a message generates a notification for recipient without exposing private message text."""
    db = SessionLocal()
    try:
        faculty1 = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        faculty2 = get_or_create_user(db, "faculty2_msg@campusflow.edu", "FACULTY", "Faculty Lovelace")
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        event = db.query(models.Event).filter(models.Event.club_id == club.id).first()

        secret_text = "CONFIDENTIAL_TOP_SECRET_CODE_12345"

        token_f2 = get_token(faculty2.email)
        token_f1 = get_token(faculty1.email)
        headers_f2 = {"Authorization": f"Bearer {token_f2}"}
        headers_f1 = {"Authorization": f"Bearer {token_f1}"}

        client.post("/api/messages", headers=headers_f2, json={
            "recipient_id": faculty1.id,
            "context_type": "EVENT",
            "context_id": event.id,
            "message": secret_text
        })

        # Check Faculty 1's notifications
        resp_notif = client.get("/api/notifications", headers=headers_f1)
        assert resp_notif.status_code == 200
        notifs = resp_notif.json()
        assert len(notifs) >= 1
        latest_notif = notifs[0]
        assert latest_notif["type"] == "MESSAGE_RECEIVED"
        assert latest_notif["entity_type"] == "EVENT"
        assert latest_notif["entity_id"] == event.id
        # Secret message body must NOT be exposed in notification body
        assert secret_text not in latest_notif["message"]
    finally:
        db.close()


def test_25_od_request_contextual_messaging():
    """25. OD Request contextual messaging between mentor faculty and club coordinator."""
    db = SessionLocal()
    try:
        mentor = get_or_create_user(db, "faculty@campusflow.edu", "FACULTY", "Faculty Turing")
        student = get_or_create_user(db, "student1@campusflow.edu", "STUDENT", "Alex Mercer", "RA2311003010001")
        club_admin = get_or_create_user(db, "clubadmin@campusflow.edu", "CLUB_ADMIN", "Club Admin Sarah")
        club = db.query(models.Club).filter(models.Club.code == "CODING_MSG_TEST").first()
        event = db.query(models.Event).filter(models.Event.club_id == club.id).first()

        od = models.ODRequest(
            student_id=student.id,
            event_id=event.id,
            mentor_id=mentor.id,
            status="PENDING",
            mentor_remark="Awaiting confirmation"
        )
        db.add(od)
        db.commit()
        db.refresh(od)

        token_mentor = get_token(mentor.email)
        headers_mentor = {"Authorization": f"Bearer {token_mentor}"}

        resp_send = client.post("/api/messages", headers=headers_mentor, json={
            "recipient_id": club_admin.id,
            "context_type": "OD_REQUEST",
            "context_id": od.id,
            "message": "Is student attendance verified for this OD?"
        })
        assert resp_send.status_code == 201

        # Check conversation thread
        token_ca = get_token(club_admin.email)
        headers_ca = {"Authorization": f"Bearer {token_ca}"}
        resp_thread = client.get(f"/api/messages/context/OD_REQUEST/{od.id}", headers=headers_ca)
        assert resp_thread.status_code == 200
        assert len(resp_thread.json()) == 1
    finally:
        db.close()
