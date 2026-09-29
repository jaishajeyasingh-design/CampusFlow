import datetime
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app import models, auth

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(models.User).filter(models.User.email == "superadmin@campusflow.edu").first():
            print("Database already seeded.")
            return

        print("Seeding initial CampusFlow data...")

        default_password = auth.get_password_hash("password123")

        # 1. Super Admin
        super_admin = models.User(
            email="superadmin@campusflow.edu",
            password_hash=default_password,
            full_name="Dr. Eleanor Vance (Super Admin)",
            system_role="SUPER_ADMIN",
            department="University Management",
            is_active=True,
        )
        db.add(super_admin)

        # 2. Admin
        admin = models.User(
            email="admin@campusflow.edu",
            password_hash=default_password,
            full_name="Marcus Brody (Student Affairs Admin)",
            system_role="ADMIN",
            department="Student Life",
            is_active=True,
        )
        db.add(admin)

        # 3. Faculty Coordinator / Class Mentor
        faculty = models.User(
            email="faculty@campusflow.edu",
            password_hash=default_password,
            full_name="Prof. Alan Turing (Faculty Mentor)",
            system_role="FACULTY",
            department="Computer Science & Engineering",
            is_active=True,
        )
        db.add(faculty)
        db.flush()

        # 4. Club Admin
        club_admin = models.User(
            email="clubadmin@campusflow.edu",
            password_hash=default_password,
            full_name="Sarah Connor (Coding Club Admin)",
            system_role="CLUB_ADMIN",
            department="Computer Science",
            is_active=True,
        )
        db.add(club_admin)

        # 5. Student 1
        student1 = models.User(
            email="student1@campusflow.edu",
            password_hash=default_password,
            full_name="Alex Mercer",
            system_role="STUDENT",
            ra_number="RA2311003010001",
            department="Computer Science",
            class_mentor_id=faculty.id,
            is_active=True,
        )
        db.add(student1)

        # 6. Student 2
        student2 = models.User(
            email="student2@campusflow.edu",
            password_hash=default_password,
            full_name="Beatrix Kiddo",
            system_role="STUDENT",
            ra_number="RA2311003010002",
            department="Information Technology",
            class_mentor_id=faculty.id,
            is_active=True,
        )
        db.add(student2)
        db.flush()

        # 7. Seed Permissions
        perm_data = [
            ("edit_venue", "Edit Venue", "Ability to change event venue"),
            ("edit_capacity", "Edit Capacity", "Ability to change event participant capacity"),
            ("view_registrations", "View Registrations", "Ability to view student registrations"),
            ("manage_members", "Manage Members", "Ability to manage club membership"),
            ("create_events", "Create Events", "Ability to draft and submit events"),
            ("edit_events", "Edit Events", "Ability to update event details"),
        ]
        permissions_dict = {}
        for code, name, desc in perm_data:
            p = models.Permission(code=code, name=name, description=desc)
            db.add(p)
            db.flush()
            permissions_dict[code] = p

        # 8. Demo Club
        coding_club = models.Club(
            name="Coding Club",
            code="CODING_CLUB",
            description="The flagship software development & competitive programming club of CampusFlow.",
            category="Technical",
            club_admin_id=club_admin.id,
            faculty_coordinator_id=faculty.id,
            status="ACTIVE"
        )
        db.add(coding_club)
        db.flush()

        # 9. Dynamic Roles for Coding Club
        logistics_lead_role = models.DynamicRole(
            club_id=coding_club.id,
            name="Logistics Lead",
            description="Manages venues, setup, and registration records."
        )
        president_role = models.DynamicRole(
            club_id=coding_club.id,
            name="President",
            description="Lead administrator of club activities."
        )
        db.add(logistics_lead_role)
        db.add(president_role)
        db.flush()

        # Role permissions for Logistics Lead: edit venue, edit capacity, view registrations
        for code in ["edit_venue", "edit_capacity", "view_registrations"]:
            rp = models.RolePermission(
                dynamic_role_id=logistics_lead_role.id,
                permission_id=permissions_dict[code].id
            )
            db.add(rp)

        # Add Student 1 as member with Logistics Lead role
        member1 = models.ClubMember(
            club_id=coding_club.id,
            user_id=student1.id,
            dynamic_role_id=logistics_lead_role.id,
            role_name="Logistics Lead",
            status="ACTIVE"
        )
        db.add(member1)

        # 10. Timetable Structure & Periods
        timetable = models.TimetableStructure(
            name="Fall 2026 Standard Academic Timetable",
            working_days="MON,TUE,WED,THU,FRI",
            effective_from=datetime.datetime(2026, 1, 1),
            is_active=True,
            created_by_id=super_admin.id
        )
        db.add(timetable)
        db.flush()

        periods_data = [
            (1, "08:00", "08:50", "CLASS"),
            (2, "08:50", "09:40", "CLASS"),
            (3, "09:40", "10:00", "SHORT_BREAK"),
            (4, "10:00", "10:50", "CLASS"),
            (5, "10:50", "11:40", "CLASS"),
            (6, "11:40", "12:30", "LUNCH_BREAK"),
            (7, "12:30", "13:20", "CLASS"),
            (8, "13:20", "14:10", "CLASS"),
        ]
        for p_num, s_time, e_time, p_type in periods_data:
            period = models.TimetablePeriod(
                timetable_structure_id=timetable.id,
                period_number=p_num,
                start_time=s_time,
                end_time=e_time,
                period_type=p_type
            )
            db.add(period)

        # 11. Demo Events representing state machine: DRAFT, PENDING_FACULTY_APPROVAL, APPROVED, REJECTED
        event_draft = models.Event(
            club_id=coding_club.id,
            title="Internal Code Jam Draft",
            description="Internal brainstorming and practice session.",
            category="Internal",
            venue="Lab 1",
            start_time=datetime.datetime(2026, 10, 1, 14, 0),
            end_time=datetime.datetime(2026, 10, 1, 17, 0),
            capacity=30,
            status="DRAFT",
            created_by_id=club_admin.id
        )

        event_pending = models.Event(
            club_id=coding_club.id,
            title="Annual Hackathon 2026",
            description="24-hour campus wide hackathon with mentorship and awards.",
            category="Hackathon",
            venue="Tech Park Auditorium",
            start_time=datetime.datetime(2026, 10, 15, 9, 0),
            end_time=datetime.datetime(2026, 10, 15, 17, 0),
            capacity=150,
            status="PENDING_FACULTY_APPROVAL",
            created_by_id=club_admin.id
        )

        event_approved = models.Event(
            club_id=coding_club.id,
            title="AI & Machine Learning Bootcamp",
            description="Hands-on session on PyTorch and LLMs for students.",
            category="Workshop",
            venue="Main Seminar Hall",
            start_time=datetime.datetime(2026, 10, 10, 10, 0),
            end_time=datetime.datetime(2026, 10, 10, 14, 0),
            capacity=60,
            status="APPROVED",
            created_by_id=club_admin.id
        )

        event_rejected = models.Event(
            club_id=coding_club.id,
            title="Overnight LAN Gaming Party",
            description="Casual gaming tournament.",
            category="Recreation",
            venue="Student Center",
            start_time=datetime.datetime(2026, 10, 20, 20, 0),
            end_time=datetime.datetime(2026, 10, 21, 4, 0),
            capacity=40,
            status="REJECTED",
            faculty_remark="Not aligned with academic objectives and venue policies.",
            created_by_id=club_admin.id
        )

        db.add_all([event_draft, event_pending, event_approved, event_rejected])
        db.flush()

        # 12. Registration & OD for Approved Event
        reg1 = models.EventRegistration(
            event_id=event_approved.id,
            student_id=student1.id,
            status="REGISTERED",
            qr_code=f"QR-EVT{event_approved.id}-STD{student1.id}"
        )
        db.add(reg1)
        db.flush()

        # OD Request for Student 1 for approved event
        od_req = models.ODRequest(
            student_id=student1.id,
            event_id=event_approved.id,
            mentor_id=faculty.id,
            status="PENDING"
        )
        db.add(od_req)
        db.flush()

        # Period snapshots for OD (10:00 to 14:00 covers periods 4, 5, 6, 7, 8)
        affected_periods = [
            ("2026-10-10", 4, "Period 4", "10:00", "10:50", "CLASS"),
            ("2026-10-10", 5, "Period 5", "10:50", "11:40", "CLASS"),
            ("2026-10-10", 6, "Lunch Break", "11:40", "12:30", "LUNCH_BREAK"),
            ("2026-10-10", 7, "Period 7", "12:30", "13:20", "CLASS"),
            ("2026-10-10", 8, "Period 8", "13:20", "14:10", "CLASS"),
        ]
        for p_date, p_num, p_name, s_t, e_t, p_typ in affected_periods:
            snap = models.ODPeriodSnapshot(
                od_request_id=od_req.id,
                period_date=p_date,
                period_number=p_num,
                period_name=p_name,
                start_time=s_t,
                end_time=e_t,
                period_type=p_typ
            )
            db.add(snap)

        # 13. Initial Badges
        badge1 = models.Badge(
            name="Code Warrior",
            description="Attended 3 technical workshops",
            icon="Terminal",
            criteria="Attend 3 coding events"
        )
        badge2 = models.Badge(
            name="Club Leader",
            description="Assigned a dynamic leadership role",
            icon="Award",
            criteria="Assigned as Logistics Lead or higher"
        )
        db.add_all([badge1, badge2])

        db.commit()
        print("Database seed successful!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
