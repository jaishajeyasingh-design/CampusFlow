import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    system_role = Column(String(50), nullable=False, index=True)  # SUPER_ADMIN, ADMIN, CLUB_ADMIN, FACULTY, STUDENT
    ra_number = Column(String(15), unique=True, nullable=True, index=True)  # Unique 15-char for STUDENT
    department = Column(String(100), nullable=True)
    class_mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    class_mentor = relationship("User", remote_side=[id], backref="mentored_students")
    admin_clubs = relationship("Club", foreign_keys="Club.club_admin_id", back_populates="club_admin")
    faculty_clubs = relationship("Club", foreign_keys="Club.faculty_coordinator_id", back_populates="faculty_coordinator")
    memberships = relationship("ClubMember", back_populates="user")
    event_registrations = relationship("EventRegistration", back_populates="student")
    od_requests = relationship("ODRequest", foreign_keys="ODRequest.student_id", back_populates="student")
    mentored_od_requests = relationship("ODRequest", foreign_keys="ODRequest.mentor_id", back_populates="mentor")
    notifications = relationship("Notification", back_populates="user")
    certificates = relationship("Certificate", back_populates="student")
    badges = relationship("StudentBadge", back_populates="student")


class Club(Base):
    __tablename__ = "clubs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    club_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    faculty_coordinator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    logo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    status = Column(String(50), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    club_admin = relationship("User", foreign_keys=[club_admin_id], back_populates="admin_clubs")
    faculty_coordinator = relationship("User", foreign_keys=[faculty_coordinator_id], back_populates="faculty_clubs")
    members = relationship("ClubMember", back_populates="club")
    dynamic_roles = relationship("DynamicRole", back_populates="club")
    events = relationship("Event", back_populates="club")


class DynamicRole(Base):
    __tablename__ = "dynamic_roles"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    club = relationship("Club", back_populates="dynamic_roles")
    role_permissions = relationship("RolePermission", back_populates="dynamic_role", cascade="all, delete-orphan")
    members = relationship("ClubMember", back_populates="dynamic_role")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id = Column(Integer, primary_key=True, index=True)
    dynamic_role_id = Column(Integer, ForeignKey("dynamic_roles.id"), nullable=False)
    permission_id = Column(Integer, ForeignKey("permissions.id"), nullable=False)

    dynamic_role = relationship("DynamicRole", back_populates="role_permissions")
    permission = relationship("Permission")

    __table_args__ = (UniqueConstraint('dynamic_role_id', 'permission_id', name='_role_permission_uc'),)


class ClubMember(Base):
    __tablename__ = "club_members"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dynamic_role_id = Column(Integer, ForeignKey("dynamic_roles.id"), nullable=True)
    role_name = Column(String(100), default="MEMBER")
    status = Column(String(50), default="ACTIVE")
    joined_at = Column(DateTime, default=datetime.datetime.utcnow)

    club = relationship("Club", back_populates="members")
    user = relationship("User", back_populates="memberships")
    dynamic_role = relationship("DynamicRole", back_populates="members")

    __table_args__ = (UniqueConstraint('club_id', 'user_id', name='_club_user_uc'),)


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    venue = Column(String(255), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    capacity = Column(Integer, nullable=False)
    status = Column(String(50), default="DRAFT")  # DRAFT, PENDING_FACULTY_APPROVAL, APPROVED, REJECTED, ONGOING, COMPLETED
    faculty_remark = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    club = relationship("Club", back_populates="events")
    creator = relationship("User")
    registrations = relationship("EventRegistration", back_populates="event")
    attendances = relationship("Attendance", back_populates="event")
    od_requests = relationship("ODRequest", back_populates="event")
    certificates = relationship("Certificate", back_populates="event")


class EventRegistration(Base):
    __tablename__ = "event_registrations"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    registered_at = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="REGISTERED")  # REGISTERED, CANCELLED, ATTENDED
    qr_code = Column(Text, nullable=True)

    event = relationship("Event", back_populates="registrations")
    student = relationship("User", back_populates="event_registrations")

    __table_args__ = (UniqueConstraint('event_id', 'student_id', name='_event_student_uc'),)


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    marked_at = Column(DateTime, default=datetime.datetime.utcnow)
    marked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    verification_method = Column(String(50), default="QR_SCAN")

    event = relationship("Event", back_populates="attendances")
    student = relationship("User", foreign_keys=[student_id])
    marked_by = relationship("User", foreign_keys=[marked_by_id])

    __table_args__ = (UniqueConstraint('event_id', 'student_id', name='_attendance_event_student_uc'),)


class TimetableStructure(Base):
    __tablename__ = "timetable_structures"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    working_days = Column(String(255), nullable=False)  # e.g., "MON,TUE,WED,THU,FRI"
    effective_from = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=False, index=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    creator = relationship("User")
    periods = relationship("TimetablePeriod", back_populates="structure", cascade="all, delete-orphan", order_by="TimetablePeriod.period_number")


class TimetablePeriod(Base):
    __tablename__ = "timetable_periods"

    id = Column(Integer, primary_key=True, index=True)
    timetable_structure_id = Column(Integer, ForeignKey("timetable_structures.id"), nullable=False)
    period_number = Column(Integer, nullable=False)
    start_time = Column(String(10), nullable=False)  # HH:MM
    end_time = Column(String(10), nullable=False)    # HH:MM
    period_type = Column(String(50), nullable=False)  # CLASS, SHORT_BREAK, LUNCH_BREAK

    structure = relationship("TimetableStructure", back_populates="periods")


class ODRequest(Base):
    __tablename__ = "od_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="PENDING")  # PENDING, APPROVED, REJECTED
    mentor_remark = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", foreign_keys=[student_id], back_populates="od_requests")
    mentor = relationship("User", foreign_keys=[mentor_id], back_populates="mentored_od_requests")
    event = relationship("Event", back_populates="od_requests")
    period_snapshots = relationship("ODPeriodSnapshot", back_populates="od_request", cascade="all, delete-orphan")


class ODPeriodSnapshot(Base):
    __tablename__ = "od_period_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    od_request_id = Column(Integer, ForeignKey("od_requests.id"), nullable=False)
    period_date = Column(String(20), nullable=False)  # YYYY-MM-DD
    period_number = Column(Integer, nullable=False)
    period_name = Column(String(100), nullable=True)
    start_time = Column(String(10), nullable=False)
    end_time = Column(String(10), nullable=False)
    period_type = Column(String(50), nullable=False)

    od_request = relationship("ODRequest", back_populates="period_snapshots")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    club_id = Column(Integer, ForeignKey("clubs.id"), nullable=True)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    club = relationship("Club")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    certificate_number = Column(String(100), unique=True, nullable=False)
    pdf_path = Column(String(500), nullable=True)
    issue_date = Column(DateTime, default=datetime.datetime.utcnow)
    verification_code = Column(String(100), unique=True, nullable=False)

    event = relationship("Event", back_populates="certificates")
    student = relationship("User", back_populates="certificates")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    icon = Column(String(100), nullable=False)
    criteria = Column(String(255), nullable=False)


class StudentBadge(Base):
    __tablename__ = "student_badges"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False)
    awarded_at = Column(DateTime, default=datetime.datetime.utcnow)

    student = relationship("User", back_populates="badges")
    badge = relationship("Badge")

    __table_args__ = (UniqueConstraint('student_id', 'badge_id', name='_student_badge_uc'),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
