import re
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator, ConfigDict

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    system_role: str  # SUPER_ADMIN, ADMIN, CLUB_ADMIN, FACULTY, STUDENT
    ra_number: Optional[str] = None
    department: Optional[str] = None
    class_mentor_id: Optional[int] = None

    @field_validator("ra_number")
    @classmethod
    def validate_ra_number(cls, v, info):
        if v is not None and v != "":
            v = v.strip().upper()
            if not re.match(r"^[A-Z0-9]{15}$", v):
                raise ValueError("RA Number must be exactly 15 alphanumeric characters.")
        return v

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    system_role: str
    ra_number: Optional[str] = None
    department: Optional[str] = None
    class_mentor_id: Optional[int] = None
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Timetable Schemas
class TimetablePeriodCreate(BaseModel):
    period_number: int
    start_time: str
    end_time: str
    period_type: str  # CLASS, SHORT_BREAK, LUNCH_BREAK

class TimetableStructureCreate(BaseModel):
    name: str
    working_days: str  # MON,TUE,WED,THU,FRI
    effective_from: datetime
    is_active: bool = False
    periods: List[TimetablePeriodCreate]

class TimetableStructureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    working_days: str
    effective_from: datetime
    is_active: bool
    created_by_id: int
    created_at: datetime

# OD Schemas
class ODRequestCreate(BaseModel):
    event_id: Optional[int] = None
    registration_id: Optional[int] = None

class ODApprovalRequest(BaseModel):
    status: str  # APPROVED, REJECTED
    mentor_remark: Optional[str] = None

class ODPeriodSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period_date: str
    period_number: int
    period_name: Optional[str]
    start_time: str
    end_time: str
    period_type: str

# Club Schemas
class ClubUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None

class ClubResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: Optional[str]
    category: Optional[str]
    club_admin_id: Optional[int]
    faculty_coordinator_id: Optional[int]
    status: str
    created_at: datetime

# Event Schemas
class EventCreate(BaseModel):
    club_id: int
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    venue: str
    start_time: datetime
    end_time: datetime
    capacity: int

class EventApprovalRequest(BaseModel):
    status: Optional[str] = "APPROVED"  # APPROVED, REJECTED
    faculty_remark: Optional[str] = None

class EventRejectRequest(BaseModel):
    reason: str

class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    club_id: int
    title: str
    description: Optional[str]
    category: Optional[str]
    venue: str
    start_time: datetime
    end_time: datetime
    capacity: int
    status: str
    faculty_remark: Optional[str]
    created_by_id: int
    created_at: datetime
    club: Optional[ClubResponse] = None

class EventRegistrationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    student_id: int
    status: str
    qr_code: Optional[str] = None
    registered_at: datetime
    event: Optional[EventResponse] = None

class ODRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    event_id: int
    mentor_id: int
    status: str
    mentor_remark: Optional[str] = None
    created_at: datetime
    period_snapshots: List[ODPeriodSnapshotResponse] = []
    event: Optional[EventResponse] = None

# Badge Schemas
class BadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    icon: str
    criteria: str

class StudentBadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    badge_id: int
    name: str
    description: str
    icon: str
    criteria: str
    awarded_at: datetime

# Certificate Schemas
class CertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: int
    student_id: int
    certificate_number: str
    verification_code: str
    event_title: Optional[str] = None
    event_date: Optional[datetime] = None
    issue_date: datetime
    pdf_url: Optional[str] = None

class CertificateVerifyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    certificate_number: str
    verification_code: str
    student_name: str
    event_title: str
    event_date: datetime
    issue_date: datetime
    certificate_type: str = "Certificate of Participation"
    status: str = "VALID"

# Notification Schemas
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    type: Optional[str] = None
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

class UnreadCountResponse(BaseModel):
    unread_count: int

# Analytics Schemas
class AnalyticsOverviewResponse(BaseModel):
    total_users: int
    total_students: int
    total_faculty: int
    total_clubs: int
    total_events: int
    draft_events: int
    pending_approval_events: int
    approved_events: int
    rejected_events: int
    ongoing_events: int
    completed_events: int
    cancelled_events: int
    total_registrations: int
    total_attendance_records: int
    total_od_requests: int
    pending_od_requests: int
    approved_od_requests: int
    rejected_od_requests: int
    total_certificates_issued: int
    total_badges_awarded: int

class EventAnalyticsResponse(BaseModel):
    total_events: int
    draft: int
    pending: int
    approved: int
    rejected: int
    ongoing: int
    completed: int
    cancelled: int
    total_capacity: int
    total_registrations: int
    capacity_utilization_pct: float

class EventRegistrationStat(BaseModel):
    event_id: int
    event_title: str
    registration_count: int

class ClubRegistrationStat(BaseModel):
    club_id: int
    club_name: str
    registration_count: int

class RegistrationAnalyticsResponse(BaseModel):
    total_registrations: int
    average_registrations_per_event: float
    registrations_by_event: List[EventRegistrationStat]
    registrations_by_club: List[ClubRegistrationStat]

class ClubAttendanceStat(BaseModel):
    club_id: int
    club_name: str
    attendance_count: int

class AttendanceAnalyticsResponse(BaseModel):
    total_attendance_records: int
    unique_students_attended: int
    attendance_rate_pct: float
    attendance_by_club: List[ClubAttendanceStat]

class ODAnalyticsResponse(BaseModel):
    total_od_requests: int
    pending: int
    approved: int
    rejected: int
    total_affected_periods: int

class EventCertificateStat(BaseModel):
    event_id: int
    event_title: str
    certificate_count: int

class CertificateAnalyticsResponse(BaseModel):
    total_certificates_issued: int
    certificates_by_event: List[EventCertificateStat]

class BadgeTypeStat(BaseModel):
    badge_id: int
    badge_name: str
    awarded_count: int

class BadgeAnalyticsResponse(BaseModel):
    total_badges_awarded: int
    unique_students_with_badges: int
    badges_by_type: List[BadgeTypeStat]

class StudentAnalyticsResponse(BaseModel):
    events_registered: int
    events_attended: int
    attendance_rate: float
    od_requests: int
    od_approved: int
    od_rejected: int
    certificates: int
    badges: int
    clubs_participated: int

class ClubAnalyticsResponse(BaseModel):
    club_id: int
    club_name: str
    total_events: int
    approved_events: int
    rejected_events: int
    completed_events: int
    total_registrations: int
    unique_participants: int
    total_attendance: int
    attendance_rate_pct: float
    od_requests: int
    certificates_issued: int
    badges_earned: int


class MessageCreate(BaseModel):
    recipient_id: int
    context_type: str
    context_id: int
    message: str


class MessageResponse(BaseModel):
    id: int
    sender_id: int
    recipient_id: int
    context_type: str
    context_id: int
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UnreadMessageCountResponse(BaseModel):
    unread_count: int







