import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import type { Event, Club } from '../../types';
import { 
  Calendar, Clock, CheckCircle2, AlertCircle, Plus, 
  ArrowRight 
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

export const ClubAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedEvents, fetchedClubs] = await Promise.all([
        eventsService.getEvents(),
        eventsService.getClubs(),
      ]);
      setEvents(fetchedEvents);
      setClubs(fetchedClubs);
    } catch (err: any) {
      console.error('Failed to load Club Admin dashboard:', err);
      setError(err.response?.data?.detail || 'Failed to fetch club admin events from server.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!user) return null;

  // Find user's managed club(s)
  const myClubs = clubs.filter((c) => c.club_admin_id === user.id);
  const myClubIds = new Set(myClubs.map((c) => c.id));
  
  // Filter events belonging to this Club Admin's club(s) (or all if Super/Admin)
  const myEvents = events.filter((e) => myClubIds.has(e.club_id) || user.system_role !== 'CLUB_ADMIN');

  const draftCount = myEvents.filter((e) => e.status === 'DRAFT').length;
  const pendingCount = myEvents.filter((e) => e.status === 'PENDING_FACULTY_APPROVAL').length;
  const approvedCount = myEvents.filter((e) => e.status === 'APPROVED').length;
  const rejectedCount = myEvents.filter((e) => e.status === 'REJECTED').length;

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-amber-50 text-amber-800 border border-amber-200">
                CLUB ADMIN PORTAL
              </span>
              {myClubs.map((c) => (
                <span key={c.id} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  {c.name} ({c.code})
                </span>
              ))}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
              Welcome back, {user.full_name}!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Manage your club events, draft new proposals, submit events for faculty approval, and track lifecycle status.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <Link
              to="/club-admin/events/create"
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Event</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Loading club admin dashboard statistics..." rows={3} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load dashboard"
          message={error}
          onRetry={loadData}
        />
      )}

      {!loading && !error && (
        <>
          {/* Real Backend Statistics Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/club-admin/events?status=DRAFT" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Draft Events</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{draftCount}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ready for submission</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
                <Calendar className="w-5 h-5" />
              </div>
            </Link>

            <Link to="/club-admin/events?status=PENDING_FACULTY_APPROVAL" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pending Approvals</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{pendingCount}</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">Awaiting faculty review</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </Link>

            <Link to="/club-admin/events?status=APPROVED" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Approved Events</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{approvedCount}</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Live & open</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </Link>

            <Link to="/club-admin/events?status=REJECTED" className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Rejected Events</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{rejectedCount}</p>
                <p className="text-[10px] text-rose-600 font-medium mt-0.5">Needs resubmission</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
                <AlertCircle className="w-5 h-5" />
              </div>
            </Link>
          </div>

          {/* Main Layout: Recent Club Events & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Recent Club Events</h2>
                  <p className="text-xs text-slate-500">Managed event proposals and published activities</p>
                </div>
                <Link
                  to="/club-admin/events"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>View All Events</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {myEvents.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-700">No club events created yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click "Create New Event" to start drafting your first event proposal.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myEvents.slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {event.category || 'General'}
                          </span>
                          <StatusBadge status={event.status} />
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">
                          {event.title}
                        </h3>

                        <p className="text-[11px] text-slate-500 flex items-center space-x-2">
                          <span>Venue: {event.venue}</span>
                          <span>•</span>
                          <span>Start: {formatDate(event.start_time)}</span>
                          <span>•</span>
                          <span>Capacity: {event.capacity}</span>
                        </p>
                      </div>

                      <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <Link
                          to={`/club-admin/events/${event.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors inline-block"
                        >
                          Manage Event
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Sidebar */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Club Admin Navigation
                </h3>
                <div className="space-y-2">
                  <Link
                    to="/club-admin/events/create"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-800 transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Create New Event</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                  </Link>

                  <Link
                    to="/club-admin/events"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-slate-600" />
                      <span>View All Club Events</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClubAdminDashboard;
