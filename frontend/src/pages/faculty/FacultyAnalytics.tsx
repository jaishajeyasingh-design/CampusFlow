import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import eventsService from '../../services/eventsService';
import odService from '../../services/odService';
import type { 
  AnalyticsOverviewResponse, 
  EventAnalyticsResponse, 
  ODAnalyticsResponse,
  AttendanceAnalyticsResponse,
  Event,
  ODRequest
} from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

import { 
  BarChart3, CheckCircle2, Clock, 
  Calendar, AlertTriangle, ShieldCheck
} from 'lucide-react';

export const FacultyAnalytics: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalyticsResponse | null>(null);
  const [odAnalytics, setOdAnalytics] = useState<ODAnalyticsResponse | null>(null);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState<AttendanceAnalyticsResponse | null>(null);

  // Fallback direct live counts
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [liveODs, setLiveODs] = useState<ODRequest[]>([]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Direct service fallback data (always authorized for Faculty)
      const [evts, ods] = await Promise.all([
        eventsService.getEvents().catch(() => []),
        odService.getODRequests().catch(() => []),
      ]);
      setLiveEvents(evts);
      setLiveODs(ods);

      // Attempt analytics APIs with silent catch for endpoints forbidden to Faculty
      const results = await Promise.allSettled([
        analyticsService.getOverviewAnalytics(),
        analyticsService.getEventAnalytics(),
        analyticsService.getODAnalytics(),
        analyticsService.getAttendanceAnalytics(),
      ]);

      if (results[0].status === 'fulfilled') setOverview(results[0].value);
      if (results[1].status === 'fulfilled') setEventAnalytics(results[1].value);
      if (results[2].status === 'fulfilled') setOdAnalytics(results[2].value);
      if (results[3].status === 'fulfilled') setAttendanceAnalytics(results[3].value);

    } catch (err: any) {
      console.error('Failed to load faculty analytics:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading Authorized Faculty Analytics..." />;
  }

  // Calculate live metric counts from direct authorized endpoints
  const pendingEventsCount = liveEvents.filter((e) => e.status === 'PENDING_FACULTY_APPROVAL').length;
  const approvedEventsCount = liveEvents.filter((e) => e.status === 'APPROVED').length;
  const rejectedEventsCount = liveEvents.filter((e) => e.status === 'REJECTED').length;
  const completedEventsCount = liveEvents.filter((e) => e.status === 'COMPLETED').length;

  const pendingODsCount = liveODs.filter((r) => r.status === 'PENDING').length;
  const approvedODsCount = liveODs.filter((r) => r.status === 'APPROVED').length;
  const rejectedODsCount = liveODs.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              FACULTY ANALYTICS DASHBOARD
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Event & OD Performance Metrics
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Real-time analytics computed directly from authoritative persisted database records. Highlighting approval queues, academic On-Duty requests, and participation metrics.
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized Scope Active</span>
          </div>
        </div>
      </div>

      {error && (
        <ErrorState
          title="Analytics Notice"
          message={error}
          onRetry={fetchAnalyticsData}
        />
      )}

      {/* Main KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Event Approvals
            </p>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {overview ? overview.pending_approval_events : pendingEventsCount}
          </p>
          <p className="text-[11px] text-amber-700 font-medium mt-2">Awaiting sign-off</p>
        </div>

        {/* Approved Events */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved Events
            </p>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {overview ? overview.approved_events : approvedEventsCount}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-2">
            Completed: {overview ? overview.completed_events : completedEventsCount}
          </p>
        </div>

        {/* OD Requests Processed */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total OD Requests
            </p>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {odAnalytics ? odAnalytics.total_od_requests : liveODs.length}
          </p>
          <p className="text-[11px] text-blue-700 font-medium mt-2">
            Pending: {odAnalytics ? odAnalytics.pending : pendingODsCount}
          </p>
        </div>

        {/* Approved ODs */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Approved ODs
            </p>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {odAnalytics ? odAnalytics.approved : approvedODsCount}
          </p>
          <p className="text-[11px] text-purple-700 font-medium mt-2">
            Rejected: {odAnalytics ? odAnalytics.rejected : rejectedODsCount}
          </p>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OD Analytics Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Academic OD Breakdown</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-700">Total Assigned OD Requests</span>
              <span className="font-mono font-bold text-slate-900">
                {odAnalytics ? odAnalytics.total_od_requests : liveODs.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-200/80">
              <span className="font-semibold text-amber-900">Pending Review</span>
              <span className="font-mono font-bold text-amber-900">
                {odAnalytics ? odAnalytics.pending : pendingODsCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
              <span className="font-semibold text-emerald-900">Approved OD Permissions</span>
              <span className="font-mono font-bold text-emerald-900">
                {odAnalytics ? odAnalytics.approved : approvedODsCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 border border-rose-200/80">
              <span className="font-semibold text-rose-900">Rejected OD Requests</span>
              <span className="font-mono font-bold text-rose-900">
                {odAnalytics ? odAnalytics.rejected : rejectedODsCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-200/80">
              <span className="font-semibold text-blue-900">Affected Academic Periods</span>
              <span className="font-mono font-bold text-blue-900">
                {odAnalytics ? odAnalytics.total_affected_periods : liveODs.reduce((acc, r) => acc + (r.period_snapshots?.length || 0), 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Event Analytics Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Event Approval Metrics</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-700">Total Events Submitted</span>
              <span className="font-mono font-bold text-slate-900">
                {eventAnalytics ? eventAnalytics.total_events : liveEvents.length}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
              <span className="font-semibold text-emerald-900">Approved Events</span>
              <span className="font-mono font-bold text-emerald-900">
                {eventAnalytics ? eventAnalytics.approved : approvedEventsCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 border border-rose-200/80">
              <span className="font-semibold text-rose-900">Rejected Events</span>
              <span className="font-mono font-bold text-rose-900">
                {eventAnalytics ? eventAnalytics.rejected : rejectedEventsCount}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50 border border-purple-200/80">
              <span className="font-semibold text-purple-900">Total Student Registrations</span>
              <span className="font-mono font-bold text-purple-900">
                {eventAnalytics ? eventAnalytics.total_registrations : (overview?.total_registrations || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="font-semibold text-slate-700">Capacity Utilization Rate</span>
              <span className="font-mono font-bold text-slate-900">
                {eventAnalytics ? `${eventAnalytics.capacity_utilization_pct.toFixed(1)}%` : 'N/A'}
              </span>
            </div>

            {attendanceAnalytics && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80">
                <span className="font-semibold text-emerald-900">Event Attendance Rate</span>
                <span className="font-mono font-bold text-emerald-900">
                  {attendanceAnalytics.attendance_rate_pct.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyAnalytics;
