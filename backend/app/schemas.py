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
    event_id: int

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

class ODRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    event_id: int
    mentor_id: int
    status: str
    mentor_remark: Optional[str]
    created_at: datetime
    period_snapshots: List[ODPeriodSnapshotResponse] = []

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
    status: str  # APPROVED, REJECTED
    faculty_remark: Optional[str] = None

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
