import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import type { Event, Club, EventRegistration } from '../../types';
import { 
  Calendar, CheckCircle2, Clock, Sparkles, 
  MapPin, ArrowRight, Shield, AlertCircle
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    try {


      const [fetchedEvents, fetchedClubs] = await Promise.all([
        eventsService.getEvents(),
        eventsService.getClubs(),
      ]);

      // Students only see approved events
      const approved = fetchedEvents.filter((e) => e.status === 'APPROVED');
      setEvents(approved);
      setClubs(fetchedClubs);

      // Load session registered events
      const sessionRegs = eventsService.getSessionRegistrations(user.id);
      setRegistrations(sessionRegs);
    } catch (err: any) {
      console.error('Failed to load student dashboard data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch campus events from server.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  if (!user) return null;

  const clubMap = new Map(clubs.map((c) => [c.id, c.name]));

  // Upcoming events sorted by start time
  const upcomingEvents = [...events]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3);

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

  const formatTime = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-700 border border-blue-200">
                STUDENT PASSPORT
              </span>
              {user.ra_number && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  RA: {user.ra_number}
                </span>
              )}
              {user.department && (
                <span className="px-2 py-0.5 rounded-md text-[10px] text-slate-500 bg-slate-50 border border-slate-200">
                  {user.department}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
              Welcome back, {user.full_name}!
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Track your campus club activities, registered workshops, OD approval statuses, and verified participation passports.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            <Link
              to="/student/events"
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-all flex items-center space-x-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Discover Events</span>
            </Link>
            <Link
              to="/student/registrations"
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 shadow-xs transition-all flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>My Registrations</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Loading your student passport and events..." rows={3} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load event data"
          message={error}
          onRetry={() => {
            setLoading(true);
            loadData();
          }}
        />

      )}

      {!loading && !error && (
        <>
          {/* Compact Metric Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Registered Events</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{registrations.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Active registrations</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Approved Events</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{events.length}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Available for registration</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Pending OD Requests</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">0</p>
                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Backend sync pending
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Digital Badges</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">—</p>
                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Endpoint not connected
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Main Two-Column Layout: Upcoming Events & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Approved Events Column (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Upcoming Approved Events</h2>
                  <p className="text-xs text-slate-500">Verified campus events currently open for registration</p>
                </div>
                <Link
                  to="/student/events"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                >
                  <span>View All</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-700">No approved events available right now.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Check back later once club coordinators publish new events.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const clubName = clubMap.get(event.club_id) || 'Campus Club';
                    const isRegistered = registrations.some((r) => r.event_id === event.id);

                    return (
                      <div
                        key={event.id}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {event.category || 'General'}
                            </span>
                            <span className="text-[11px] text-slate-500 flex items-center space-x-1 font-medium">
                              <Shield className="w-3 h-3 text-blue-600" />
                              <span>{clubName}</span>
                            </span>
                            <StatusBadge status={event.status} />
                          </div>

                          <h3 className="text-sm font-bold text-slate-900">
                            {event.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDate(event.start_time)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{event.venue}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          {isRegistered ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Registered</span>
                            </span>
                          ) : (
                            <Link
                              to={`/student/events/${event.id}`}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all shadow-xs"
                            >
                              View & Register
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions & Activity Sidebar Column (1 col) */}
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Link
                    to="/student/events"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>Browse Campus Events</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    to="/student/registrations"
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-800 transition-colors"
                  >
                    <span className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>View My QR Passes</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

              {/* Backend API Integration Status Box */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-900">
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                  <span>Backend Integration Status</span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span>Events & Registration API</span>
                    <span className="font-semibold text-emerald-600">Connected</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span>Clubs API</span>
                    <span className="font-semibold text-emerald-600">Connected</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span>My Registered Events List</span>
                    <span className="font-semibold text-amber-600">Session State</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span>OD & Badges List API</span>
                    <span className="font-semibold text-slate-400">Endpoint Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
