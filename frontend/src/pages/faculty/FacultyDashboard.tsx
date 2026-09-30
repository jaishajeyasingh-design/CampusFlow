import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import odService from '../../services/odService';
import notificationService from '../../services/notificationService';
import analyticsService from '../../services/analyticsService';
import type { Event, ODRequest, ODAnalyticsResponse } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

import { 
  CheckCircle2, Clock, AlertTriangle, Bell, 
  ChevronRight, Sparkles, Shield, XCircle
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<Event[]>([]);
  const [odRequests, setOdRequests] = useState<ODRequest[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [odAnalytics, setOdAnalytics] = useState<ODAnalyticsResponse | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [allEvents, allODs, notifRes] = await Promise.all([
        eventsService.getEvents(),
        odService.getODRequests(),
        notificationService.getUnreadNotificationCount().catch(() => ({ unread_count: 0 })),
      ]);

      setEvents(allEvents);
      setOdRequests(allODs);
      setUnreadNotifCount(notifRes.unread_count);

      // Attempt analytics fetch (handle permissions gracefully)
      try {
        const odStats = await analyticsService.getODAnalytics();
        setOdAnalytics(odStats);
      } catch {
        setOdAnalytics(null);
      }
    } catch (err: any) {
      console.error('Failed to load faculty dashboard data:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load faculty dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading Faculty Portal Dashboard..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Dashboard Error"
        message={error}
        onRetry={loadDashboardData}
      />
    );
  }

  // Calculate real counts from fetched records
  const pendingEventApprovals = events.filter((e) => e.status === 'PENDING_FACULTY_APPROVAL');
  const approvedEvents = events.filter((e) => e.status === 'APPROVED');
  const rejectedEvents = events.filter((e) => e.status === 'REJECTED');

  const pendingODRequests = odRequests.filter((r) => r.status === 'PENDING');
  const approvedODRequests = odRequests.filter((r) => r.status === 'APPROVED');
  const rejectedODRequests = odRequests.filter((r) => r.status === 'REJECTED');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                FACULTY PORTAL
              </span>
              {user?.department && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {user.department}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
              Welcome, {user?.full_name || 'Faculty Mentor'}
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              CampusFlow Faculty Dashboard. Review pending event approval requests from club leads, grant academic On-Duty (OD) permissions for students, and monitor campus participation metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/student/notifications')}
              leftIcon={<Bell className="w-4 h-4 text-blue-600" />}
            >
              Notifications ({unreadNotifCount})
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Event Approvals */}
        <div 
          onClick={() => navigate('/faculty/event-approvals')}
          className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
              Pending Event Approvals
            </p>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {pendingEventApprovals.length}
          </p>
          <div className="flex items-center justify-between mt-3 text-xs text-amber-700 font-medium">
            <span>Requires Faculty Sign-off</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Pending OD Requests */}
        <div 
          onClick={() => navigate('/faculty/od-approvals')}
          className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
              Pending OD Requests
            </p>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {pendingODRequests.length}
          </p>
          <div className="flex items-center justify-between mt-3 text-xs text-blue-700 font-medium">
            <span>Assigned Students</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Approved Events */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Approved Events
            </p>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {approvedEvents.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-3">
            Total {events.length} events processed
          </p>
        </div>

        {/* Rejected Events */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Rejected Events
            </p>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {rejectedEvents.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-3">
            With faculty feedback notes
          </p>
        </div>
      </div>

      {/* Main Approval Action Queues Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Event Approvals Quick List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">Event Approval Queue</h2>
              </div>
              <Link
                to="/faculty/event-approvals"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
              >
                <span>View All ({pendingEventApprovals.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {pendingEventApprovals.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-700">Queue Clear</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No events are currently awaiting your approval.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {pendingEventApprovals.slice(0, 3).map((evt) => (
                  <div key={evt.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-800 line-clamp-1">{evt.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {evt.club?.name || `Club #${evt.club_id}`} &bull; Venue: {evt.venue}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Date: {new Date(evt.start_time).toLocaleDateString()} ({new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      <StatusBadge status={evt.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate('/faculty/event-approvals')}
            >
              Open Event Approval Portal
            </Button>
          </div>
        </div>

        {/* Pending OD Requests Quick List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Student OD Approvals Queue</h2>
              </div>
              <Link
                to="/faculty/od-approvals"
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
              >
                <span>View All ({pendingODRequests.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {pendingODRequests.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-700">No Pending Requests</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No pending OD requests assigned to you.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {pendingODRequests.slice(0, 3).map((req) => (
                  <div key={req.id} className="py-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-semibold text-slate-800">
                        {req.event?.title || `Event #${req.event_id}`}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Student ID: #{req.student_id} &bull; Requested on: {new Date(req.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5">
                        {req.period_snapshots?.length || 0} Affected Timetable Periods
                      </p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={req.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate('/faculty/od-approvals')}
            >
              Open OD Approvals Portal
            </Button>
          </div>
        </div>
      </div>

      {/* Academic OD & Participation Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Academic & OD Overview</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/faculty/analytics')}
            rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
          >
            Detailed Analytics
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-medium text-slate-500 uppercase">Total OD Processed</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{odRequests.length}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Approved: {approvedODRequests.length} &bull; Rejected: {rejectedODRequests.length}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-medium text-slate-500 uppercase">Affected Periods Recorded</p>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {odAnalytics ? odAnalytics.total_affected_periods : odRequests.reduce((acc, r) => acc + (r.period_snapshots?.length || 0), 0)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Derived from live active timetable structure
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-medium text-slate-500 uppercase">Faculty Portal Status</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">Authorized</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Backend JWT server-side validated
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
