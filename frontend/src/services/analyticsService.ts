import api from './api';
import type {
  AnalyticsOverviewResponse,
  EventAnalyticsResponse,
  RegistrationAnalyticsResponse,
  AttendanceAnalyticsResponse,
  ODAnalyticsResponse,
  CertificateAnalyticsResponse,
  BadgeAnalyticsResponse,
  StudentAnalyticsResponse,
  ClubAnalyticsResponse,
} from '../types';

export const analyticsService = {
  async getOverviewAnalytics(startDate?: string, endDate?: string): Promise<AnalyticsOverviewResponse> {
    const res = await api.get<AnalyticsOverviewResponse>('/analytics/overview', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getEventAnalytics(startDate?: string, endDate?: string): Promise<EventAnalyticsResponse> {
    const res = await api.get<EventAnalyticsResponse>('/analytics/events', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getRegistrationAnalytics(startDate?: string, endDate?: string): Promise<RegistrationAnalyticsResponse> {
    const res = await api.get<RegistrationAnalyticsResponse>('/analytics/registrations', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getAttendanceAnalytics(startDate?: string, endDate?: string): Promise<AttendanceAnalyticsResponse> {
    const res = await api.get<AttendanceAnalyticsResponse>('/analytics/attendance', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getODAnalytics(startDate?: string, endDate?: string): Promise<ODAnalyticsResponse> {
    const res = await api.get<ODAnalyticsResponse>('/analytics/od', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getCertificateAnalytics(startDate?: string, endDate?: string): Promise<CertificateAnalyticsResponse> {
    const res = await api.get<CertificateAnalyticsResponse>('/analytics/certificates', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getBadgeAnalytics(startDate?: string, endDate?: string): Promise<BadgeAnalyticsResponse> {
    const res = await api.get<BadgeAnalyticsResponse>('/analytics/badges', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getStudentAnalytics(startDate?: string, endDate?: string): Promise<StudentAnalyticsResponse> {
    const res = await api.get<StudentAnalyticsResponse>('/analytics/student', {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },

  async getClubAnalytics(clubId: number, startDate?: string, endDate?: string): Promise<ClubAnalyticsResponse> {
    const res = await api.get<ClubAnalyticsResponse>(`/analytics/club/${clubId}`, {
      params: { start_date: startDate, end_date: endDate },
    });
    return res.data;
  },
};

export default analyticsService;
