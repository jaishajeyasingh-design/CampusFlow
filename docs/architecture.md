# CampusFlow Platform Architecture & Specification

## Tech Stack Overview

### Frontend
- **Framework**: React 19 + TypeScript + Vite 8
- **Styling**: Tailwind CSS v4 + Custom Dark Glassmorphism Design System
- **Routing**: React Router DOM v7
- **API Client**: Axios with JWT Bearer Token Interceptor & Auto-logout on 401
- **Icons**: Lucide React

### Backend
- **Framework**: Python FastAPI
- **ORM**: SQLAlchemy 2.0
- **Database**: SQLite3 (Enforced `PRAGMA foreign_keys = ON;`)
- **Authentication**: JWT (JSON Web Tokens) with PyJWT + Passlib / Bcrypt password hashing
- **Data Validation**: Pydantic v2 with 15-character Alphanumeric RA Number validation
- **PDF & Verifications**: ReportLab (PDF Certificates) & QRCode (Verification Tokens)

---

## Core Database Schema (SQLite3)

### Entity Relationship & Core Tables
1. **`users`**:
   - `id`, `email`, `password_hash`, `full_name`, `system_role` (`SUPER_ADMIN`, `ADMIN`, `CLUB_ADMIN`, `FACULTY`, `STUDENT`)
   - `ra_number`: 15-character alphanumeric, UNIQUE at DB level. Required for `STUDENT` system role.
   - `department`, `class_mentor_id` (FK to `users.id`), `is_active`, `created_at`

2. **`clubs`**:
   - `id`, `name` (UNIQUE), `code` (UNIQUE), `description`, `category`
   - `club_admin_id` (FK `users.id`), `faculty_coordinator_id` (FK `users.id`), `status`, `created_at`

3. **`dynamic_roles` & `permissions`**:
   - Dynamic Roles: `id`, `club_id` (FK `clubs.id`), `name`, `description`
   - Permissions: `id`, `code` (UNIQUE), `name`, `description`
   - `role_permissions`: Join table linking dynamic role to configurable permissions (`edit_venue`, `edit_capacity`, `view_registrations`, etc.)

4. **`club_members`**:
   - `id`, `club_id` (FK `clubs.id`), `user_id` (FK `users.id`), `dynamic_role_id` (FK `dynamic_roles.id`), `role_name`, `status`, `joined_at`

5. **`events`**:
   - `id`, `club_id` (FK `clubs.id`), `title`, `description`, `category`, `venue`, `start_time`, `end_time`, `capacity`
   - `status`: State machine: `DRAFT` → `PENDING_FACULTY_APPROVAL` → `APPROVED` / `REJECTED` → `ONGOING` → `COMPLETED`
   - `faculty_remark`, `created_by_id` (FK `users.id`), `created_at`

6. **`event_registrations` & `attendance`**:
   - `event_registrations`: `id`, `event_id` (FK `events.id`), `student_id` (FK `users.id`), `status`, `qr_code`, `registered_at`
   - `attendance`: `id`, `event_id` (FK `events.id`), `student_id` (FK `users.id`), `marked_at`, `marked_by_id` (FK `users.id`), `verification_method`

7. **`timetable_structures` & `timetable_periods`**:
   - Timetable Structures: Managed exclusively by `SUPER_ADMIN`. Contains `name`, `working_days`, `effective_from`, `is_active`, `created_by_id`.
   - Timetable Periods: Ordered periods with `period_number`, `start_time`, `end_time`, `period_type` (`CLASS`, `SHORT_BREAK`, `LUNCH_BREAK`). Validation: `end > start`, no overlaps.

8. **`od_requests` & `od_period_snapshots`**:
   - `od_requests`: `id`, `student_id` (FK `users.id`), `event_id` (FK `events.id`), `mentor_id` (FK `users.id`), `status` (`PENDING`, `APPROVED`, `REJECTED`), `mentor_remark`
   - `od_period_snapshots`: Snapshots affected timetable periods at request time (`period_date`, `period_number`, `start_time`, `end_time`, `period_type`) so historical OD records remain immutable even if timetable structure changes later.

9. **`notifications`, `messages`, `certificates`, `badges`, `student_badges`, `audit_logs`**:
   - Full persistence for audit history, PDF certificate generation, badge awards, and Faculty-to-Club Admin messaging.

---

## State Machines & Workflows

### Event State Machine
```
[DRAFT]
  │
  ▼
[PENDING_FACULTY_APPROVAL]
  │                     │
  ▼                     ▼
[APPROVED]          [REJECTED]
  │                     │ (Requires resubmission)
  ▼                     ▼
[ONGOING]           [DRAFT / Resubmission]
  │
  ▼
[COMPLETED]
```

### OD Approval Workflow
1. Student registers for an `APPROVED` event.
2. Student submits OD request.
3. System automatically calculates overlapping timetable periods based on active timetable structure and stores period snapshots.
4. OD request is routed to student's assigned Class Mentor (Faculty).
5. Mentor approves or rejects OD request with optional remark.
