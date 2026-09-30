import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import { extractApiErrorMessage } from '../../services/api';
import type { Event, Club } from '../../types';
import { 
  Calendar, Clock, MapPin, Plus, Shield, Search, 
  Send, RotateCcw, AlertCircle, ArrowRight 
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

export const ClubEvents: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const statusFilter = searchParams.get('status') || 'ALL';

  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const loadEvents = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedEvents, fetchedClubs] = await Promise.all([
        eventsService.getEvents(),
        eventsService.getClubs(),
      ]);
      setEvents(fetchedEvents);
      setClubs(fetchedClubs);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load club events from server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  if (!user) return null;

  const clubMap = new Map(clubs.map((c) => [c.id, c]));
  const myClubs = clubs.filter((c) => c.club_admin_id === user.id);
  const myClubIds = new Set(myClubs.map((c) => c.id));

  // Filter events belonging to Club Admin's club (or all for SUPER_ADMIN/ADMIN)
  const clubScopedEvents = events.filter((e) => myClubIds.has(e.club_id) || user.system_role !== 'CLUB_ADMIN');

  // Filtered by status & search
  const filteredEvents = clubScopedEvents.filter((e) => {
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesSearch = 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const handleSubmitForApproval = async (eventId: number) => {
    setSubmittingId(eventId);
    try {
      const updated = await eventsService.submitEvent(eventId);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (err) {
      alert(extractApiErrorMessage(err, 'Failed to submit event for faculty approval.'));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleResubmit = async (eventId: number) => {
    setSubmittingId(eventId);
    try {
      const updated = await eventsService.resubmitEvent(eventId);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    } catch (err) {
      alert(extractApiErrorMessage(err, 'Failed to resubmit event for faculty approval.'));
    } finally {
      setSubmittingId(null);
    }
  };

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

  const statusOptions = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'PENDING_FACULTY_APPROVAL', label: 'Pending Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'ONGOING', label: 'Ongoing' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Club Event Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, draft, and submit club event proposals for faculty approval.
          </p>
        </div>
        <Link
          to="/club-admin/events/create"
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Event</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search event title, venue, or description..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setSearchParams({ status: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-blue-600"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Fetching club events..." rows={4} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load events"
          message={error}
          onRetry={loadEvents}
        />
      )}

      {/* Empty State */}
      {!loading && !error && filteredEvents.length === 0 && (
        <EmptyState
          title="No Club Events Found"
          description={
            statusFilter !== 'ALL' || searchQuery
              ? 'No events match your active status filter or search query.'
              : 'You have not created any event proposals yet.'
          }
          action={
            statusFilter === 'ALL' && !searchQuery
              ? {
                  label: 'Create First Event',
                  onClick: () => window.location.assign('/club-admin/events/create'),
                  icon: <Plus className="w-3.5 h-3.5" />,
                }
              : undefined
          }
        />
      )}

      {/* Events List */}
      {!loading && !error && filteredEvents.length > 0 && (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const club = clubMap.get(event.club_id);

            return (
              <div
                key={event.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {event.category || 'General'}
                      </span>
                      {club && (
                        <span className="text-[11px] text-slate-500 flex items-center space-x-1 font-medium">
                          <Shield className="w-3.5 h-3.5 text-blue-600" />
                          <span>{club.name}</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {event.title}
                    </h3>
                  </div>

                  <StatusBadge status={event.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatDate(event.start_time)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{event.venue} (Cap: {event.capacity})</span>
                  </div>
                </div>

                {/* Faculty Rejection Remark banner if REJECTED */}
                {event.status === 'REJECTED' && event.faculty_remark && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-0.5">
                    <span className="font-bold text-rose-800 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Faculty Rejection Reason:</span>
                    </span>
                    <p className="text-rose-900 text-[11px] leading-relaxed pl-4">
                      {event.faculty_remark}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to={`/club-admin/events/${event.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                  >
                    <span>View Event Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center space-x-2">
                    {event.status === 'DRAFT' && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                        isLoading={submittingId === event.id}
                        onClick={() => handleSubmitForApproval(event.id)}
                      >
                        Submit for Approval
                      </Button>
                    )}

                    {event.status === 'REJECTED' && (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                        isLoading={submittingId === event.id}
                        onClick={() => handleResubmit(event.id)}
                      >
                        Resubmit Proposal
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClubEvents;
