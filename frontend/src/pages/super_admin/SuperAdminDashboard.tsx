import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import analyticsService from '../../services/analyticsService';
import timetableService from '../../services/timetableService';
import notificationService from '../../services/notificationService';
import type { 
  AnalyticsOverviewResponse, 
  EventAnalyticsResponse, 
  ODAnalyticsResponse,
  TimetableStructure
} from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';

import { 
  ShieldAlert, Clock, Calendar, Users, 
  CheckCircle2, ChevronRight, Bell
} from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalyticsResponse | null>(null);
  const [odAnalytics, setOdAnalytics] = useState<ODAnalyticsResponse | null>(null);
  const [activeTimetable, setActiveTimetable] = useState<TimetableStructure | null>(null);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [timetables, notifRes] = await Promise.all([
        timetableService.getTimetableStructures().catch(() => []),
        notificationService.getUnreadNotificationCount().catch(() => ({ unread_count: 0 })),
      ]);

      const active = timetables.find((t) => t.is_active) || timetables[0] || null;
      setActiveTimetable(active);
      setUnreadNotifCount(notifRes.unread_count);

      // Fetch analytics (catch if restricted or fail)
      const results = await Promise.allSettled([
        analyticsService.getOverviewAnalytics(),
        analyticsService.getEventAnalytics(),
        analyticsService.getODAnalytics(),
      ]);

      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      if (results[1].status === 'fulfilled') setEventAnalytics(results[1].value);
      if (results[2].status === 'fulfilled') setOdAnalytics(results[2].value);

    } catch (err: any) {
      console.error('Failed to load Super Admin dashboard:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading Super Admin Command Center..." />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200">
                SUPER ADMIN PORTAL
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                SYSTEM ROOT AUTHORIZED
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
              Super Admin Command Center — Welcome, {user?.full_name || 'Dr. Vance'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              CampusFlow system governance console. Manage global academic timetable structures, monitor campus-wide events, registrations, On-Duty authorizations, and compliance metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/super-admin/timetable')}
              leftIcon={<Clock className="w-4 h-4 text-blue-600" />}
            >
              Timetable Manager
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/notifications')}
              leftIcon={<Bell className="w-4 h-4 text-slate-500" />}
            >
              Notifications ({unreadNotifCount})
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Dashboard Notice"
          message={error}
          onRetry={fetchDashboardData}
        />
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Campus Platform Users
            </p>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {overview ? overview.total_users : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            Students: {overview ? overview.total_students : 0} &bull; Faculty: {overview ? overview.total_faculty : 0}
          </p>
        </div>

        {/* Active Timetable Status */}
        <div 
          onClick={() => navigate('/super-admin/timetable')}
          className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
              Active Academic Schedule
            </p>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-base font-bold text-slate-900 mt-2 truncate">
            {activeTimetable ? activeTimetable.name : 'No Active Structure'}
          </p>
          <div className="flex items-center justify-between mt-3 text-xs text-blue-700 font-medium">
            <span>
              {activeTimetable?.periods?.length || 0} Periods &bull; {activeTimetable?.working_days || 'MON-FRI'}
            </span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Total Events */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Campus Events
            </p>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {overview ? overview.total_events : (eventAnalytics?.total_events || 0)}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            Approved: {overview ? overview.approved_events : 0} &bull; Pending: {overview ? overview.pending_approval_events : 0}
          </p>
        </div>

        {/* Total Registrations & Attendance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Registrations
            </p>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {overview ? overview.total_registrations : 0}
          </p>
          <p className="text-[11px] text-purple-700 font-medium mt-2">
            Attendance Records: {overview ? overview.total_attendance_records : 0}
          </p>
        </div>
      </div>

      {/* Secondary Metrics & Quick Navigation Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* On-Duty & Cert Highlights */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">Governance & Compliance Metrics</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              Live Database Verification
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[11px] font-medium text-slate-500 uppercase">On-Duty Requests</p>
              <p className="text-xl font-bold text-slate-900">
                {odAnalytics ? odAnalytics.total_od_requests : (overview?.total_od_requests || 0)}
              </p>
              <p className="text-[11px] text-slate-500">
                Approved: {odAnalytics ? odAnalytics.approved : (overview?.approved_od_requests || 0)}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Certificates Issued</p>
              <p className="text-xl font-bold text-slate-900">
                {overview ? overview.total_certificates_issued : 0}
              </p>
              <p className="text-[11px] text-slate-500">Cryptographically Verified</p>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <p className="text-[11px] font-medium text-slate-500 uppercase">Badges Earned</p>
              <p className="text-xl font-bold text-slate-900">
                {overview ? overview.total_badges_awarded : 0}
              </p>
              <p className="text-[11px] text-slate-500">Automated Criteria</p>
            </div>
          </div>
        </div>

        {/* Timetable Quick Control Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Timetable Structure Control</h2>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <p className="text-slate-600">
                Super Admins can define working days, effective dates, and period schedules for the entire campus.
              </p>
              {activeTimetable && (
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 space-y-1 mt-2">
                  <p className="font-semibold text-blue-900">{activeTimetable.name}</p>
                  <p className="text-[11px] text-blue-700 font-mono">
                    Working Days: {activeTimetable.working_days}
                  </p>
                  <p className="text-[10px] text-blue-600">
                    Effective: {new Date(activeTimetable.effective_from).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate('/super-admin/timetable')}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Manage Timetables & Periods
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
