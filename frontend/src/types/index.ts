export type SystemRole = 'SUPER_ADMIN' | 'ADMIN' | 'CLUB_ADMIN' | 'FACULTY' | 'STUDENT';

export interface User {
  id: number;
  email: string;
  full_name: string;
  system_role: SystemRole;
  ra_number?: string | null;
  department?: string | null;
  class_mentor_id?: number | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  system_role: SystemRole;
  ra_number?: string | null;
  department?: string | null;
  class_mentor_id?: number | null;
}

export interface ApiValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export interface ApiErrorResponse {
  detail?: string | ApiValidationError[];
  message?: string;
}

export interface Club {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  category?: string | null;
  club_admin_id?: number | null;
  faculty_coordinator_id?: number | null;
  status: string;
  created_at: string;
}

export interface ClubUpdate {
  name?: string;
  description?: string;
  category?: string;
  logo_url?: string;
  banner_url?: string;
}

export interface Event {
  id: number;
  club_id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  venue: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: 'DRAFT' | 'PENDING_FACULTY_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  faculty_remark?: string | null;
  created_by_id: number;
  created_at: string;
  club?: Club | null;
}

export interface EventCreate {
  club_id: number;
  title: string;
  description?: string;
  category?: string;
  venue: string;
  start_time: string;
  end_time: string;
  capacity: number;
}

export interface EventApprovalRequest {
  status?: 'APPROVED' | 'REJECTED';
  faculty_remark?: string;
}

export interface EventRejectRequest {
  reason: string;
}

export interface RegisterEventResponse {
  message: string;
  registration_id: number;
  qr_code: string;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  student_id: number;
  status: 'REGISTERED' | 'ATTENDED' | 'CANCELLED' | string;
  qr_code?: string | null;
  registered_at: string;
  event?: Event | null;
}

export interface ODPeriodSnapshot {
  id: number;
  period_date: string;
  period_number: number;
  period_name?: string | null;
  start_time: string;
  end_time: string;
  period_type: string;
}

export interface ODRequest {
  id: number;
  student_id: number;
  event_id: number;
  mentor_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  mentor_remark?: string | null;
  created_at: string;
  period_snapshots?: ODPeriodSnapshot[];
  event?: Event | null;
  student?: User | null;
}

export interface ODRequestCreate {
  event_id?: number;
  registration_id?: number;
}

export interface ODApprovalRequest {
  status: 'APPROVED' | 'REJECTED';
  mentor_remark?: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon: string;
  criteria: string;
}

export interface StudentBadge {
  id: number;
  badge_id: number;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  awarded_at: string;
}

export interface Certificate {
  id: number;
  event_id: number;
  student_id: number;
  certificate_number: string;
  verification_code: string;
  event_title?: string | null;
  event_date?: string | null;
  issue_date: string;
  pdf_url?: string | null;
}

export interface CertificateVerify {
  certificate_number: string;
  verification_code: string;
  student_name: string;
  event_title: string;
  event_date: string;
  issue_date: string;
  certificate_type: string;
  status: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type?: string | null;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: number | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UnreadNotificationCount {
  unread_count: number;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id: number;
  context_type: 'EVENT' | 'OD_REQUEST' | string;
  context_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface MessageCreate {
  recipient_id: number;
  context_type: 'EVENT' | 'OD_REQUEST' | string;
  context_id: number;
  message: string;
}

export interface UnreadMessageCount {
  unread_count: number;
}

export interface TimetablePeriod {
  period_number: number;
  start_time: string;
  end_time: string;
  period_type: 'CLASS' | 'SHORT_BREAK' | 'LUNCH_BREAK' | string;
}

export interface TimetableStructureCreate {
  name: string;
  working_days: string;
  effective_from: string;
  is_active?: boolean;
  periods: TimetablePeriod[];
}

export interface TimetableStructure {
  id: number;
  name: string;
  working_days: string;
  effective_from: string;
  is_active: boolean;
  created_by_id: number;
  created_at: string;
  periods?: TimetablePeriod[];
}

export interface AttendanceMarkRequest {
  event_id: number;
  student_id: number;
  verification_method?: string;
}

export interface AttendanceMarkResponse {
  id: number;
  event_id: number;
  student_id: number;
  marked_at: string;
  verification_method?: string;
}

// Analytics Interfaces
export interface AnalyticsOverviewResponse {
  total_users: number;
  total_students: number;
  total_faculty: number;
  total_clubs: number;
  total_events: number;
  draft_events: number;
  pending_approval_events: number;
  approved_events: number;
  rejected_events: number;
  ongoing_events: number;
  completed_events: number;
  cancelled_events: number;
  total_registrations: number;
  total_attendance_records: number;
  total_od_requests: number;
  pending_od_requests: number;
  approved_od_requests: number;
  rejected_od_requests: number;
  total_certificates_issued: number;
  total_badges_awarded: number;
}

export interface EventAnalyticsResponse {
  total_events: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  ongoing: number;
  completed: number;
  cancelled: number;
  total_capacity: number;
  total_registrations: number;
  capacity_utilization_pct: number;
}

export interface EventRegistrationStat {
  event_id: number;
  event_title: string;
  registration_count: number;
}

export interface ClubRegistrationStat {
  club_id: number;
  club_name: string;
  registration_count: number;
}

export interface RegistrationAnalyticsResponse {
  total_registrations: number;
  average_registrations_per_event: number;
  registrations_by_event: EventRegistrationStat[];
  registrations_by_club: ClubRegistrationStat[];
}

export interface ClubAttendanceStat {
  club_id: number;
  club_name: string;
  attendance_count: number;
}

export interface AttendanceAnalyticsResponse {
  total_attendance_records: number;
  unique_students_attended: number;
  attendance_rate_pct: number;
  attendance_by_club: ClubAttendanceStat[];
}

export interface ODAnalyticsResponse {
  total_od_requests: number;
  pending: number;
  approved: number;
  rejected: number;
  total_affected_periods: number;
}

export interface EventCertificateStat {
  event_id: number;
  event_title: string;
  certificate_count: number;
}

export interface CertificateAnalyticsResponse {
  total_certificates_issued: number;
  certificates_by_event: EventCertificateStat[];
}

export interface BadgeTypeStat {
  badge_id: number;
  badge_name: string;
  awarded_count: number;
}

export interface BadgeAnalyticsResponse {
  total_badges_awarded: number;
  unique_students_with_badges: number;
  badges_by_type: BadgeTypeStat[];
}

export interface StudentAnalyticsResponse {
  events_registered: number;
  events_attended: number;
  attendance_rate: number;
  od_requests: number;
  od_approved: number;
  od_rejected: number;
  certificates: number;
  badges: number;
  clubs_participated: number;
}

export interface ClubAnalyticsResponse {
  club_id: number;
  club_name: string;
  total_events: number;
  approved_events: number;
  rejected_events: number;
  completed_events: number;
  total_registrations: number;
  unique_participants: number;
  total_attendance: number;
  attendance_rate_pct: number;
  od_requests: number;
  certificates_issued: number;
  badges_earned: number;
}
