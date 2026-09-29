# CampusFlow Implementation Status Report

This document provides a detailed breakdown of the current implementation status of the CampusFlow platform, comparing existing modules, models, endpoints, workflows, and tests against the Campus Club Management hackathon problem statement.

---

## 1. Existing Backend Modules
- **`backend/app/main.py`**: FastAPI application entry point, CORS middleware configuration (supporting frontend origins), database table initialization (`Base.metadata.create_all`), startup database auto-seeding hook, and root health check endpoint (`/`).
- **`backend/app/database.py`**: SQLAlchemy engine configuration for SQLite database (`campusflow.db`), session factory (`SessionLocal`), base class (`Base`), and DB session dependency (`get_db`) enforcing foreign key constraints via `PRAGMA foreign_keys = ON;`.
- **`backend/app/models.py`**: Declarative ORM models defining 19 database tables with explicit foreign key relationships and index definitions.
- **`backend/app/schemas.py`**: Pydantic schemas (Pydantic v2) for request/response validation, featuring custom regex validation for 15-character alphanumeric Student Register/RA Numbers.
- **`backend/app/auth.py`**: JWT token generation and verification using `PyJWT` (HS256 algorithm), password hashing using `passlib[bcrypt]`, current user resolution dependency (`get_current_user`), system role guards (`require_role`), club administrative access guards (`require_club_access`), and dynamic permission checker (`require_permission`).
- **`backend/app/seed.py`**: Database seeder script (`seed_database`) populating initial demo accounts across all system roles (`SUPER_ADMIN`, `ADMIN`, `CLUB_ADMIN`, `FACULTY`, `STUDENT` 1 & 2), 1 default club ("Coding Club"), 1 timetable structure with 4 periods, sample events across states (`DRAFT`, `PENDING_FACULTY_APPROVAL`, `APPROVED`, `REJECTED`), registrations, OD requests, badges, notifications, and certificates.
- **`backend/app/routers/auth_router.py`**: Router providing user registration, JSON login, OAuth2 password request form login, and profile lookup (`/api/auth/me`).
- **`backend/app/routers/club_router.py`**: Router providing endpoints to list clubs, view club details, and update club metadata with role authorization checks.
- **`backend/app/routers/event_router.py`**: Router providing event listing (role-filtered for students), event creation in `DRAFT` status, event approval/rejection for faculty/admins, and student event registration.
- **`backend/app/routers/od_router.py`**: Router providing OD request retrieval with timetable period snapshots and OD request approval/rejection by assigned Class Mentors.
- **`backend/app/routers/timetable_router.py`**: Router providing timetable structure listing, creation, and updating (restricted to Super Admin).

---

## 2. Existing Frontend Pages
- **`Login.tsx` (`/login`)**: Authentication screen with email/password input, error message alerts, quick demo role selection shortcuts (Super Admin, Admin, Club Admin, Faculty, Student 1, Student 2), and redirection upon successful login.
- **`Register.tsx` (`/register`)**: User registration form supporting system role selection, dynamic rendering of the 15-character uppercase alphanumeric RA Number input field when the selected role is `STUDENT`, password validation, and automatic login/redirection.
- **`DashboardShell.tsx` (`/dashboard`)**: Responsive dashboard shell displaying a role-specific welcome banner, summary metrics cards (customized per system role), and a Phase 1 system status breakdown panel.
- **`Layout.tsx` (App Shell Wrapper)**: Main layout component providing a side navigation bar with role-specific link rendering, a top header with active timetable indicators, a demo role quick-switcher dropdown menu, and user logout capability.

---

## 3. Existing API Endpoints
| HTTP Method | Endpoint | Authorization / Role Guard | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Open | API root health check endpoint. |
| `POST` | `/api/auth/register` | Open | User registration with 15-char student RA validation and audit logging. |
| `POST` | `/api/auth/login` | Open | Authenticates user via JSON payload and returns JWT access token. |
| `POST` | `/api/auth/token` | Open | OAuth2 password request form login endpoint. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves current authenticated user profile. |
| `GET` | `/api/clubs` | Open | Returns list of all registered campus clubs. |
| `GET` | `/api/clubs/{club_id}` | Open | Retrieves specific club details by ID. |
| `PUT` | `/api/clubs/{club_id}/manage` | Club Admin / Admin / Super Admin | Updates club details (name, description, category, logo/banner URLs). |
| `GET` | `/api/events` | Authenticated (Students see `APPROVED` only) | Returns list of events. |
| `POST` | `/api/events` | `SUPER_ADMIN`, `ADMIN`, `CLUB_ADMIN`, or dynamic `create_events` permission | Creates a new club event in `DRAFT` status. |
| `POST` | `/api/events/{event_id}/approve` | `FACULTY` (assigned coordinator), `ADMIN`, `SUPER_ADMIN` | Approves or rejects an event request (forbids Club Admin self-approval). |
| `POST` | `/api/events/{event_id}/register` | `STUDENT` | Registers student for an `APPROVED` event, enforcing capacity & uniqueness. |
| `GET` | `/api/timetable/structures` | Authenticated | Returns all academic timetable structures. |
| `POST` | `/api/timetable/structures` | `SUPER_ADMIN` | Creates new timetable structure and periods with start/end time validation. |
| `PUT` | `/api/timetable/structures/{structure_id}` | `SUPER_ADMIN` | Replaces periods and updates existing timetable structure. |
| `GET` | `/api/od-requests/{od_id}` | Owner Student / Assigned Mentor / Admins | Retrieves OD request details along with period snapshots. |
| `POST` | `/api/od-requests/{od_id}/approve` | Assigned Class Mentor / Admins | Approves or rejects student OD request (forbids student approval). |

---

## 4. Existing Database Tables
1. **`users`**: System users (`id`, `email`, `password_hash`, `full_name`, `system_role`, `ra_number`, `department`, `class_mentor_id`, `is_active`, `created_at`).
2. **`clubs`**: Campus clubs (`id`, `name`, `code`, `description`, `category`, `club_admin_id`, `faculty_coordinator_id`, `logo_url`, `banner_url`, `status`, `created_at`).
3. **`dynamic_roles`**: Custom intra-club roles (`id`, `club_id`, `name`, `description`, `created_at`).
4. **`permissions`**: System permission registry (`id`, `code`, `name`, `description`).
5. **`role_permissions`**: Mapping join table linking `dynamic_role_id` and `permission_id` with unique constraint.
6. **`club_members`**: Club membership mappings (`id`, `club_id`, `user_id`, `dynamic_role_id`, `role_name`, `status`, `joined_at`).
7. **`events`**: Club events (`id`, `club_id`, `title`, `description`, `category`, `venue`, `start_time`, `end_time`, `capacity`, `status`, `faculty_remark`, `created_by_id`, `created_at`).
8. **`event_registrations`**: Student event registrations (`id`, `event_id`, `student_id`, `registered_at`, `status`, `qr_code`).
9. **`attendance`**: Event attendance logs (`id`, `event_id`, `student_id`, `marked_at`, `marked_by_id`, `verification_method`).
10. **`timetable_structures`**: Timetable configurations (`id`, `name`, `working_days`, `effective_from`, `is_active`, `created_by_id`, `created_at`).
11. **`timetable_periods`**: Individual timetable periods (`id`, `timetable_structure_id`, `period_number`, `start_time`, `end_time`, `period_type`).
12. **`od_requests`**: On-Duty leave requests (`id`, `student_id`, `event_id`, `mentor_id`, `status`, `mentor_remark`, `created_at`).
13. **`od_period_snapshots`**: Immutable snapshots of affected timetable periods (`id`, `od_request_id`, `period_date`, `period_number`, `period_name`, `start_time`, `end_time`, `period_type`).
14. **`notifications`**: User notification history (`id`, `user_id`, `title`, `message`, `link`, `is_read`, `created_at`).
15. **`messages`**: Direct messages between faculty and club admins (`id`, `sender_id`, `receiver_id`, `club_id`, `subject`, `body`, `created_at`).
16. **`certificates`**: Issued event certificates (`id`, `event_id`, `student_id`, `certificate_number`, `pdf_path`, `issue_date`, `verification_code`).
17. **`badges`**: System achievement badges (`id`, `name`, `description`, `icon`, `criteria`).
18. **`student_badges`**: Student badge awards (`id`, `student_id`, `badge_id`, `awarded_at`).
19. **`audit_logs`**: System audit trial log (`id`, `user_id`, `action`, `entity`, `entity_id`, `previous_value`, `new_value`, `timestamp`).

---

## 5. Existing Authentication
- **Mechanism**: JSON Web Token (JWT) Bearer Token authentication via `PyJWT`.
- **Password Hashing**: Bcrypt password hashing using `passlib.context.CryptContext`.
- **Token Lifespan**: Set to 24 hours (`ACCESS_TOKEN_EXPIRE_MINUTES = 1440`).
- **Client Integration**: Frontend Axios instance (`api.ts`) automatically injects `Authorization: Bearer <token>` into all outbound HTTP requests and handles HTTP 401 unauthorized responses by clearing tokens.

---

## 6. Existing RBAC Implementation
- **System-Wide Roles**: Enforces 5 distinct system roles: `SUPER_ADMIN`, `ADMIN`, `CLUB_ADMIN`, `FACULTY`, `STUDENT`.
- **System Role Guards**: Endpoint dependency decorator `require_role(*allowed_roles)` blocks unauthorized access with HTTP 403 Forbidden responses.
- **Club Access Authorization**: Dependency `require_club_access(club_id)` verifies whether a user is Super Admin, Admin, assigned `club_admin_id`, assigned `faculty_coordinator_id`, or an active `ClubMember`.
- **Dynamic Permission Evaluation**: `require_permission(permission_code, club_id)` evaluates dynamic roles assigned to club members against the `role_permissions` join table for granular access control.
- **Context-Sensitive Filtering**: Restricts Students to `APPROVED` events and prevents users from accessing or approving OD requests outside their authorized scope.

---

## 7. Existing Event Workflow
- **State Machine Definition**: `DRAFT` $\rightarrow$ `PENDING_FACULTY_APPROVAL` $\rightarrow$ `APPROVED` / `REJECTED` $\rightarrow$ `ONGOING` $\rightarrow$ `COMPLETED`.
- **Creation**: Club Admins / Admins create events initialized in `DRAFT` state.
- **Faculty Approval**: Faculty Coordinators and Admins can approve or reject pending events with optional remarks via `/api/events/{id}/approve`. Prevents Club Admins from self-approving their own events.
- **Registration**: Students can register only for `APPROVED` events with capacity enforcement and unique QR code string generation.

---

## 8. Existing OD Workflow
- **OD Request Querying**: `GET /api/od-requests/{od_id}` returns request status along with immutable `od_period_snapshots` taken during creation.
- **Mentor Approval**: Assigned Class Mentors (Faculty) or Admins can approve or reject OD requests with remarks via `/api/od-requests/{od_id}/approve`. Forbids students from approving OD requests.
- **Audit Logging**: Logs state transitions (`OD_APPROVED`, `OD_REJECTED`) into the `audit_logs` database table.

---

## 9. Existing Timetable Workflow
- **Structure Configuration**: Super Admins can list, create, and update academic timetable structures containing ordered period definitions (`CLASS`, `SHORT_BREAK`, `LUNCH_BREAK`).
- **Timing Validation**: Validates that period `start_time` is strictly earlier than `end_time` during creation and update calls.

---

## 10. Existing Tests
The backend test suite in [`backend/tests/test_auth_rbac.py`](file:///c:/Users/jaish/OneDrive/Desktop/CampusFlow/backend/tests/test_auth_rbac.py) covers security boundaries and attack vectors:
1. `test_attack_1_student_accessing_super_admin_timetable`: Verifies HTTP 403 when a Student attempts to create a timetable structure.
2. `test_attack_2_club_admin_editing_timetable`: Verifies HTTP 403 when a Club Admin attempts to edit a timetable structure.
3. `test_attack_3_student_accessing_another_students_od`: Verifies HTTP 403 when a Student attempts to view another student's OD request.
4. `test_attack_4_unrelated_faculty_accessing_club_management`: Verifies HTTP 403 when an unassigned Faculty attempts to update club details.
5. `test_attack_5_club_admin_or_student_approving_event`: Verifies HTTP 403 when a Club Admin attempts to approve their own event.
6. `test_attack_6_student_approving_od`: Verifies HTTP 403 when a Student attempts to approve an OD request.
7. `test_attack_7_student_registering_for_unapproved_event`: Verifies HTTP 400/403 when a Student attempts to register for a `DRAFT` or `PENDING` event.
8. `test_legitimate_super_admin_timetable_creation`: Verifies HTTP 201 Created when a Super Admin creates a valid timetable structure.

---

## 11. Missing Mandatory Requirements
- **OD Request Submission Endpoint**: No API endpoint (`POST /api/od-requests`) allowing students to submit OD requests for registered events and automatically compute/snapshot overlapping timetable periods based on the active structure.
- **Attendance & QR Code Verification Engine**: No backend endpoints (`POST /api/attendance/scan` or `POST /api/events/{id}/attendance`) for event organizers to scan student QR codes or mark attendance.
- **PDF Certificate Generation & Public Verification Engine**: ReportLab PDF certificate rendering engine and public verification lookup endpoint (`GET /api/certificates/verify/{code}`) are missing.
- **Dynamic Role & Permission API Endpoints**: Endpoints to create dynamic roles, link permissions to roles, and assign dynamic roles to club members (`POST /api/clubs/{id}/roles`, `POST /api/clubs/{id}/members/role`) are not implemented.
- **User Management & Class Mentor Assignment Endpoints**: Super Admin / Admin CRUD endpoints for user management (assigning Class Mentors to students, updating user roles/status).
- **Faculty-Club Admin Messaging Endpoints**: Endpoints to send, read, and list direct messages/remarks between Faculty Coordinators and Club Admins.
- **Notification API Endpoints**: Endpoints to fetch user notifications and mark them as read (`GET /api/notifications`, `PUT /api/notifications/{id}/read`).
- **Gamification & Passport Engine**: Logic to calculate student activity points, automatically award badges based on attendance thresholds, and present student passport statistics.
- **Dedicated Frontend Sub-Pages**: React view components for all sidebar routes (`/users`, `/clubs`, `/timetable`, `/audit-logs`, `/events`, `/faculty/event-approvals`, `/faculty/od-approvals`, `/club/events`, `/club/attendance`, `/student/events`, `/student/od`, `/student/certificates`, `/student/badges`, etc.). Currently all sidebar routes fall back to `DashboardShell.tsx`.

---

## 12. Partially Implemented Requirements
- **Event Lifecycle State Transitions**: Events can be created (`DRAFT`) and approved (`APPROVED`/`REJECTED`), but API endpoints for resubmission (`DRAFT` $\rightarrow$ `PENDING_FACULTY_APPROVAL`), starting an event (`APPROVED` $\rightarrow$ `ONGOING`), completing an event (`ONGOING` $\rightarrow$ `COMPLETED`), and editing event details are missing.
- **Club Management**: Basic metadata updates exist (`PUT /api/clubs/{id}/manage`), but creating clubs, listing members, joining clubs, and managing club roles/coordinators are incomplete.
- **Timetable Management**: Structure creation and updating exist, but active structure toggling (`is_active`), period overlap checking across multiple periods, and student schedule lookup endpoints are incomplete.
- **Frontend Dashboard**: `DashboardShell` renders static indicator cards per role, but does not fetch live real-time counts from backend API endpoints.

---

## 13. Known Bugs
1. **Intra-Structure Timetable Period Overlap Gap**: `timetable_router.py` checks `start_time >= end_time` for individual periods, but does not validate if two periods within the same structure overlap with each other (e.g., Period 1: 09:00–10:00 and Period 2: 09:30–10:30).
2. **Hardcoded JWT Secret Key**: `SECRET_KEY` in `backend/app/auth.py` is hardcoded as `"campusflow-super-secret-key-change-in-production-hackathon-2026"` without fallback to environment variables (`.env`).
3. **Frontend Vite Dev Server Proxy Missing**: `frontend/src/services/api.ts` sets `baseURL: '/api'`, but `frontend/vite.config.ts` does not configure a dev server proxy targeting `http://localhost:8000`. Requests from the Vite dev server hit Vite directly, resulting in 404 responses unless resolved by proxy configuration or explicit URL.

---

## 14. Frontend-Backend Integrations That Are Incomplete
- **Auth Switcher Integration**: `switchDemoRole` in `AuthContext.tsx` assumes password `"password123"` for all accounts, failing if credentials differ or if the API proxy is unconfigured.
- **Live Dashboard Data Binding**: `DashboardShell.tsx` relies on mock data strings rather than calling `/api/events`, `/api/od-requests`, or `/api/clubs`.
- **Sidebar Route Linkage**: Navigation links point to sub-routes that lack matching page views and API integrations.
- **Event & OD UI Workflows**: No frontend interactive forms or dialogs exist for event creation, faculty event approval/rejection, student event registration, student OD application, or mentor OD approval.

---

## Concise Summary

- **COMPLETED**:
  - Core 19 SQLAlchemy database tables with SQLite FK PRAGMA enforcement.
  - JWT Authentication, Bcrypt password hashing, and system role guards (`SUPER_ADMIN`, `ADMIN`, `CLUB_ADMIN`, `FACULTY`, `STUDENT`).
  - 15-character alphanumeric Register/RA Number validation for students in backend and frontend.
  - Initial endpoints for Auth, Club metadata updates, Event creation/approval/registration, Timetable creation/updating, and OD request viewing/approval.
  - Comprehensive RBAC attack vector test suite (`test_auth_rbac.py`).
  - React 19 + TypeScript + Vite + Tailwind v4 frontend shell with Login, Register, and DashboardShell pages.

- **PARTIAL**:
  - Event state machine (missing transitions for `PENDING_FACULTY_APPROVAL`, `ONGOING`, `COMPLETED`).
  - Timetable management (missing active structure toggle, overlap check algorithms, student timetable view).
  - Club management (missing club creation, member management, coordinator assignment).
  - Frontend integration (Dashboard uses static mock counts instead of live API metrics).

- **MISSING**:
  - Student OD Request Submission endpoint (`POST /api/od-requests`) with automated period snapshotting.
  - Attendance scanning and QR code verification endpoints (`POST /api/attendance/scan`).
  - ReportLab PDF Certificate generation engine and public verification endpoint.
  - Dynamic Role & Permission management endpoints.
  - Super Admin / Admin User Management CRUD endpoints.
  - Faculty $\leftrightarrow$ Club Admin direct messaging endpoints.
  - User notifications API endpoints.
  - Gamification & Passport badge award calculation engine.
  - Dedicated React page views for all sidebar sub-routes.

- **BUGS**:
  - Timetable period overlap validation missing within same structure payload.
  - Hardcoded JWT secret key in `auth.py`.
  - Missing Vite dev server proxy in `vite.config.ts` for `/api` requests.
