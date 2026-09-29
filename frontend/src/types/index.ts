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
  description?: string;
  category?: string;
  club_admin_id?: number;
  faculty_coordinator_id?: number;
  logo_url?: string;
  banner_url?: string;
  status: string;
  created_at: string;
}

export interface Event {
  id: number;
  club_id: number;
  title: string;
  description?: string;
  category?: string;
  venue: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: 'DRAFT' | 'PENDING_FACULTY_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ONGOING' | 'COMPLETED';
  faculty_remark?: string;
  created_by_id: number;
  created_at: string;
  club?: Club;
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
  status: 'REGISTERED' | 'ATTENDED' | 'CANCELLED';
  qr_code?: string;
  registered_at?: string;
  event?: Event;
}

export interface ODRequest {
  id: number;
  student_id: number;
  event_id: number;
  mentor_id: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  mentor_remark?: string;
  created_at: string;
  event?: Event;
}

